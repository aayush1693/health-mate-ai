# Generated from: pneumonia_detection_training.ipynb
# Converted at: 2026-01-24T14:22:26.876Z
# Next step (optional): refactor into modules & generate tests with RunCell
# Quick start: pip install runcell

# ## 1. Setup and Dependencies


# Install required packages
!pip install -q kaggle tensorflow matplotlib seaborn scikit-learn

# Import libraries
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# TensorFlow imports
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import VGG16
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# Sklearn imports
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_curve, auc,
    precision_recall_curve, accuracy_score, precision_score,
    recall_score, f1_score
)

print(f"TensorFlow Version: {tf.__version__}")
print(f"GPU Available: {tf.config.list_physical_devices('GPU')}")

# ## 2. Setup Kaggle API and Download Dataset


# Create Kaggle directory and upload your kaggle.json file
# You need to upload your kaggle.json file from Kaggle account settings

from google.colab import files

# Create .kaggle directory
!mkdir -p ~/.kaggle

# Upload kaggle.json
print("Please upload your kaggle.json file:")
uploaded = files.upload()

# Move to correct location
!mv kaggle.json ~/.kaggle/
!chmod 600 ~/.kaggle/kaggle.json

print("\n✅ Kaggle API configured successfully!")

# Download the Chest X-Ray Pneumonia dataset
!kaggle datasets download -d paultimothymooney/chest-xray-pneumonia

# Unzip the dataset
!unzip -q chest-xray-pneumonia.zip -d ./data

print("\n✅ Dataset downloaded and extracted!")

# Define data paths
DATA_DIR = Path('./data/chest_xray')
TRAIN_DIR = DATA_DIR / 'train'
VAL_DIR = DATA_DIR / 'val'
TEST_DIR = DATA_DIR / 'test'

# Check directory structure
print("📁 Dataset Structure:")
for split in ['train', 'val', 'test']:
    split_dir = DATA_DIR / split
    if split_dir.exists():
        for cls in ['NORMAL', 'PNEUMONIA']:
            cls_dir = split_dir / cls
            if cls_dir.exists():
                count = len(list(cls_dir.glob('*')))
                print(f"  {split}/{cls}: {count} images")

# ## 3. Data Exploration and Visualization


# Visualize sample images
def plot_sample_images(data_dir, n_samples=5):
    """Plot sample images from each class"""
    fig, axes = plt.subplots(2, n_samples, figsize=(15, 6))

    for i, cls in enumerate(['NORMAL', 'PNEUMONIA']):
        cls_dir = data_dir / 'train' / cls
        images = list(cls_dir.glob('*'))[:n_samples]

        for j, img_path in enumerate(images):
            img = plt.imread(str(img_path))
            axes[i, j].imshow(img, cmap='gray')
            axes[i, j].axis('off')
            if j == 0:
                axes[i, j].set_ylabel(cls, fontsize=12)

    plt.suptitle('Sample Chest X-Ray Images', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.show()

plot_sample_images(DATA_DIR)

# Plot class distribution
def plot_class_distribution(data_dir):
    """Plot class distribution across splits"""
    splits = ['train', 'val', 'test']
    classes = ['NORMAL', 'PNEUMONIA']

    data = []
    for split in splits:
        for cls in classes:
            cls_dir = data_dir / split / cls
            if cls_dir.exists():
                count = len(list(cls_dir.glob('*')))
                data.append({'Split': split.title(), 'Class': cls, 'Count': count})

    df = pd.DataFrame(data)

    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(len(splits))
    width = 0.35

    normal_counts = df[df['Class'] == 'NORMAL']['Count'].values
    pneumonia_counts = df[df['Class'] == 'PNEUMONIA']['Count'].values

    bars1 = ax.bar(x - width/2, normal_counts, width, label='Normal', color='#2ecc71')
    bars2 = ax.bar(x + width/2, pneumonia_counts, width, label='Pneumonia', color='#e74c3c')

    ax.set_xlabel('Dataset Split')
    ax.set_ylabel('Number of Images')
    ax.set_title('Class Distribution Across Dataset Splits')
    ax.set_xticks(x)
    ax.set_xticklabels([s.title() for s in splits])
    ax.legend()

    # Add value labels
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{int(height)}',
                       xy=(bar.get_x() + bar.get_width() / 2, height),
                       ha='center', va='bottom', fontsize=9)

    plt.tight_layout()
    plt.show()

plot_class_distribution(DATA_DIR)

# ## 4. Data Preprocessing and Augmentation


# Configuration
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 30
LEARNING_RATE = 0.0001

# Data augmentation for training
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    shear_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    fill_mode='nearest'
)

# Only rescaling for validation and test
val_test_datagen = ImageDataGenerator(rescale=1./255)

# Create data generators
train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    shuffle=True
)

val_generator = val_test_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    shuffle=False
)

test_generator = val_test_datagen.flow_from_directory(
    TEST_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    shuffle=False
)

print(f"\n✅ Data generators created!")
print(f"Training samples: {train_generator.samples}")
print(f"Validation samples: {val_generator.samples}")
print(f"Test samples: {test_generator.samples}")
print(f"Class indices: {train_generator.class_indices}")

# ## 5. Model Architecture - Transfer Learning with VGG16


def build_model(input_shape=(224, 224, 3)):
    """Build pneumonia detection model using VGG16 transfer learning"""

    # Load pre-trained VGG16 model
    base_model = VGG16(
        weights='imagenet',
        include_top=False,
        input_shape=input_shape
    )

    # Freeze base model layers
    for layer in base_model.layers:
        layer.trainable = False

    # Build custom top layers
    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(512, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.5),
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(1, activation='sigmoid')
    ])

    return model

# Build and compile model
model = build_model()

model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE),
    loss='binary_crossentropy',
    metrics=['accuracy', tf.keras.metrics.AUC(name='auc'),
             tf.keras.metrics.Precision(name='precision'),
             tf.keras.metrics.Recall(name='recall')]
)

model.summary()

# ## 6. Model Training


# Define callbacks
callbacks = [
    EarlyStopping(
        monitor='val_loss',
        patience=5,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=3,
        min_lr=1e-7,
        verbose=1
    ),
    ModelCheckpoint(
        'pneumonia_model_best.keras',
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
]

# Calculate class weights for imbalanced data
from sklearn.utils.class_weight import compute_class_weight

class_weights = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(train_generator.classes),
    y=train_generator.classes
)
class_weight_dict = dict(enumerate(class_weights))
print(f"Class weights: {class_weight_dict}")

# Train the model
print("\n🚀 Starting training...\n")

history = model.fit(
    train_generator,
    steps_per_epoch=train_generator.samples // BATCH_SIZE,
    epochs=EPOCHS,
    validation_data=val_generator,
    validation_steps=val_generator.samples // BATCH_SIZE,
    callbacks=callbacks,
    class_weight=class_weight_dict,
    verbose=1
)

print("\n✅ Training completed!")

# ## 7. Training History Visualization


def plot_training_history(history):
    """Plot training and validation metrics"""
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # Accuracy
    axes[0, 0].plot(history.history['accuracy'], label='Train', linewidth=2)
    axes[0, 0].plot(history.history['val_accuracy'], label='Validation', linewidth=2)
    axes[0, 0].set_title('Model Accuracy', fontsize=12, fontweight='bold')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Accuracy')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)

    # Loss
    axes[0, 1].plot(history.history['loss'], label='Train', linewidth=2)
    axes[0, 1].plot(history.history['val_loss'], label='Validation', linewidth=2)
    axes[0, 1].set_title('Model Loss', fontsize=12, fontweight='bold')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('Loss')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)

    # AUC
    axes[1, 0].plot(history.history['auc'], label='Train', linewidth=2)
    axes[1, 0].plot(history.history['val_auc'], label='Validation', linewidth=2)
    axes[1, 0].set_title('Model AUC', fontsize=12, fontweight='bold')
    axes[1, 0].set_xlabel('Epoch')
    axes[1, 0].set_ylabel('AUC')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)

    # Precision & Recall
    axes[1, 1].plot(history.history['precision'], label='Train Precision', linewidth=2)
    axes[1, 1].plot(history.history['recall'], label='Train Recall', linewidth=2, linestyle='--')
    axes[1, 1].plot(history.history['val_precision'], label='Val Precision', linewidth=2)
    axes[1, 1].plot(history.history['val_recall'], label='Val Recall', linewidth=2, linestyle='--')
    axes[1, 1].set_title('Precision & Recall', fontsize=12, fontweight='bold')
    axes[1, 1].set_xlabel('Epoch')
    axes[1, 1].set_ylabel('Score')
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3)

    plt.suptitle('Training History - Pneumonia Detection Model', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('pneumonia_training_history.png', dpi=300, bbox_inches='tight')
    plt.show()

plot_training_history(history)

# ## 8. Model Evaluation


# Load best model
model = keras.models.load_model('pneumonia_model_best.keras')

# Evaluate on test set
print("\n📊 Evaluating model on test set...\n")
test_generator.reset()
test_results = model.evaluate(test_generator, verbose=1)

print("\n" + "="*50)
print("TEST SET RESULTS")
print("="*50)
for name, value in zip(model.metrics_names, test_results):
    print(f"{name.title()}: {value:.4f}")

# Get predictions
test_generator.reset()
y_pred_prob = model.predict(test_generator, verbose=1)
y_pred = (y_pred_prob > 0.5).astype(int).flatten()
y_true = test_generator.classes

# Classification Report
print("\n" + "="*50)
print("CLASSIFICATION REPORT")
print("="*50)
print(classification_report(y_true, y_pred, target_names=['Normal', 'Pneumonia']))

# Confusion Matrix
def plot_confusion_matrix(y_true, y_pred, classes=['Normal', 'Pneumonia']):
    """Plot confusion matrix"""
    cm = confusion_matrix(y_true, y_pred)

    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=classes, yticklabels=classes,
                annot_kws={'size': 16})
    plt.title('Confusion Matrix - Pneumonia Detection', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.tight_layout()
    plt.savefig('pneumonia_confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()

    # Print metrics
    tn, fp, fn, tp = cm.ravel()
    print(f"\nTrue Negatives: {tn}")
    print(f"False Positives: {fp}")
    print(f"False Negatives: {fn}")
    print(f"True Positives: {tp}")
    print(f"\nSensitivity (Recall): {tp/(tp+fn):.4f}")
    print(f"Specificity: {tn/(tn+fp):.4f}")

plot_confusion_matrix(y_true, y_pred)

# ROC Curve
def plot_roc_curve(y_true, y_pred_prob):
    """Plot ROC curve"""
    fpr, tpr, thresholds = roc_curve(y_true, y_pred_prob)
    roc_auc = auc(fpr, tpr)

    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color='#3498db', lw=2,
             label=f'ROC Curve (AUC = {roc_auc:.4f})')
    plt.plot([0, 1], [0, 1], color='gray', lw=2, linestyle='--',
             label='Random Classifier')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title('ROC Curve - Pneumonia Detection', fontsize=14, fontweight='bold')
    plt.legend(loc='lower right')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('pneumonia_roc_curve.png', dpi=300, bbox_inches='tight')
    plt.show()

plot_roc_curve(y_true, y_pred_prob)

# Precision-Recall Curve
def plot_precision_recall_curve(y_true, y_pred_prob):
    """Plot precision-recall curve"""
    precision, recall, thresholds = precision_recall_curve(y_true, y_pred_prob)

    plt.figure(figsize=(8, 6))
    plt.plot(recall, precision, color='#e74c3c', lw=2)
    plt.xlabel('Recall', fontsize=12)
    plt.ylabel('Precision', fontsize=12)
    plt.title('Precision-Recall Curve - Pneumonia Detection', fontsize=14, fontweight='bold')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('pneumonia_pr_curve.png', dpi=300, bbox_inches='tight')
    plt.show()

plot_precision_recall_curve(y_true, y_pred_prob)

# Comprehensive Metrics Summary
def print_metrics_summary(y_true, y_pred, y_pred_prob):
    """Print comprehensive metrics summary"""
    print("\n" + "="*60)
    print("COMPREHENSIVE METRICS SUMMARY - PNEUMONIA DETECTION")
    print("="*60)

    # Calculate all metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    fpr, tpr, _ = roc_curve(y_true, y_pred_prob)
    roc_auc = auc(fpr, tpr)

    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()
    specificity = tn / (tn + fp)

    metrics = {
        'Accuracy': accuracy,
        'Precision': precision,
        'Recall (Sensitivity)': recall,
        'Specificity': specificity,
        'F1-Score': f1,
        'ROC-AUC': roc_auc
    }

    for name, value in metrics.items():
        print(f"{name:25s}: {value:.4f} ({value*100:.2f}%)")

    print("\n" + "-"*60)
    print("Confusion Matrix Values:")
    print(f"  True Positives (TP):  {tp:5d}")
    print(f"  True Negatives (TN):  {tn:5d}")
    print(f"  False Positives (FP): {fp:5d}")
    print(f"  False Negatives (FN): {fn:5d}")
    print("="*60)

print_metrics_summary(y_true, y_pred, y_pred_prob)

# ## 9. Save Model


# Save final model
model.save('pneumonia_model.keras')
print("✅ Model saved as 'pneumonia_model.keras'")

# Download model
from google.colab import files
files.download('pneumonia_model.keras')

# Also download evaluation plots
files.download('pneumonia_training_history.png')
files.download('pneumonia_confusion_matrix.png')
files.download('pneumonia_roc_curve.png')
files.download('pneumonia_pr_curve.png')

# ## 10. Sample Predictions Visualization


def visualize_predictions(model, test_generator, n_samples=10):
    """Visualize sample predictions"""
    test_generator.reset()
    batch = next(test_generator)
    images, labels = batch

    predictions = model.predict(images[:n_samples], verbose=0)

    fig, axes = plt.subplots(2, 5, figsize=(15, 6))
    axes = axes.flatten()

    class_names = ['Normal', 'Pneumonia']

    for i in range(n_samples):
        ax = axes[i]
        ax.imshow(images[i])

        pred_class = int(predictions[i] > 0.5)
        true_class = int(labels[i])
        confidence = predictions[i][0] if pred_class == 1 else 1 - predictions[i][0]

        color = 'green' if pred_class == true_class else 'red'

        ax.set_title(f'True: {class_names[true_class]}\n'
                    f'Pred: {class_names[pred_class]}\n'
                    f'Conf: {confidence*100:.1f}%',
                    color=color, fontsize=10)
        ax.axis('off')

    plt.suptitle('Sample Predictions', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('pneumonia_sample_predictions.png', dpi=300, bbox_inches='tight')
    plt.show()

visualize_predictions(model, test_generator)

# ## Summary
# 
# This notebook trained a pneumonia detection model using:
# - **Dataset**: Kaggle Chest X-Ray Pneumonia dataset
# - **Architecture**: VGG16 with transfer learning
# - **Input**: 224x224 RGB images
# - **Output**: Binary classification (Normal/Pneumonia)
# 
# The model has been saved as `pneumonia_model.keras` and can be deployed in the HealthMate ML service.