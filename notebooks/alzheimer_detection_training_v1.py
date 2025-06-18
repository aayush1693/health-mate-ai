# Generated from: alzheimer_detection_training (1).ipynb
# Converted at: 2026-01-24T14:22:06.099Z
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
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# Sklearn imports
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_curve, auc,
    precision_recall_curve, accuracy_score, precision_score,
    recall_score, f1_score
)
from sklearn.preprocessing import label_binarize

print(f"TensorFlow Version: {tf.__version__}")
print(f"GPU Available: {tf.config.list_physical_devices('GPU')}")

# ## 2. Setup Kaggle API and Download Dataset


# Create Kaggle directory and upload your kaggle.json file
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

# Updated Download and extract dataset (using a live mirror)
!kaggle datasets download -d preetpalsingh25/alzheimers-dataset-4-class-of-images
!unzip -q alzheimers-dataset-4-class-of-images.zip -d ./data

print("\n✅ Dataset downloaded and extracted!")

# List data directory contents
!ls -la ./data/

# Define data paths
DATA_DIR = Path('./data/Alzheimer_s Dataset')

# Check directory structure
if not DATA_DIR.exists():
    DATA_DIR = Path('./data')
    for item in DATA_DIR.iterdir():
        if item.is_dir():
            DATA_DIR = item
            break

TRAIN_DIR = DATA_DIR / 'train'
TEST_DIR = DATA_DIR / 'test'

print(f"\nData directory: {DATA_DIR}")
print(f"Train directory: {TRAIN_DIR}")
print(f"Test directory: {TEST_DIR}")

# Check dataset structure
print("\n📁 Dataset Structure:")
for split in ['train', 'test']:
    split_dir = DATA_DIR / split
    if split_dir.exists():
        print(f"\n{split.upper()}:")
        for cls in sorted(split_dir.iterdir()):
            if cls.is_dir():
                count = len(list(cls.glob('*')))
                print(f"  {cls.name}: {count} images")

# ## 3. Data Exploration and Visualization


# Get class names
class_names = sorted([d.name for d in TRAIN_DIR.iterdir() if d.is_dir()])
print(f"Classes found: {class_names}")
print(f"Number of classes: {len(class_names)}")

# Visualize sample images
def plot_sample_images(data_dir, class_names, n_samples=4):
    """Plot sample images from each class"""
    n_classes = len(class_names)
    fig, axes = plt.subplots(n_classes, n_samples, figsize=(12, 3*n_classes))

    for i, cls in enumerate(class_names):
        cls_dir = data_dir / cls
        images = list(cls_dir.glob('*'))[:n_samples]

        for j, img_path in enumerate(images):
            img = plt.imread(str(img_path))
            axes[i, j].imshow(img, cmap='gray' if len(img.shape) == 2 else None)
            axes[i, j].axis('off')
            if j == 0:
                axes[i, j].set_ylabel(cls.replace('_', ' '), fontsize=10, rotation=0, ha='right')

    plt.suptitle('Sample Brain MRI Images by Dementia Stage', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.show()

plot_sample_images(TRAIN_DIR, class_names)

# Plot class distribution
def plot_class_distribution(train_dir, test_dir, class_names):
    """Plot class distribution for train and test sets"""
    train_counts = []
    test_counts = []

    for cls in class_names:
        train_counts.append(len(list((train_dir / cls).glob('*'))))
        test_counts.append(len(list((test_dir / cls).glob('*'))))

    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(16, 5))

    # Training set bar chart
    colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c']
    bars1 = ax1.bar([c.replace('_', '\n') for c in class_names], train_counts, color=colors)
    ax1.set_xlabel('Class')
    ax1.set_ylabel('Number of Images')
    ax1.set_title('Training Set Distribution')
    for bar, count in zip(bars1, train_counts):
        ax1.annotate(f'{count}', xy=(bar.get_x() + bar.get_width()/2, bar.get_height()),
                    ha='center', va='bottom', fontsize=10)

    # Test set bar chart
    bars2 = ax2.bar([c.replace('_', '\n') for c in class_names], test_counts, color=colors)
    ax2.set_xlabel('Class')
    ax2.set_ylabel('Number of Images')
    ax2.set_title('Test Set Distribution')
    for bar, count in zip(bars2, test_counts):
        ax2.annotate(f'{count}', xy=(bar.get_x() + bar.get_width()/2, bar.get_height()),
                    ha='center', va='bottom', fontsize=10)

    # Pie chart for total
    total_counts = [t + te for t, te in zip(train_counts, test_counts)]
    ax3.pie(total_counts, labels=[c.replace('_', ' ') for c in class_names],
           autopct='%1.1f%%', colors=colors, explode=[0.02]*len(class_names))
    ax3.set_title('Overall Class Proportion')

    plt.suptitle('Alzheimer\'s MRI Dataset Distribution', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.show()

    # Print summary
    print("\n📊 Dataset Summary:")
    print(f"{'Class':<25} {'Train':>10} {'Test':>10} {'Total':>10}")
    print("-" * 55)
    for cls, train, test in zip(class_names, train_counts, test_counts):
        print(f"{cls:<25} {train:>10} {test:>10} {train+test:>10}")
    print("-" * 55)
    print(f"{'TOTAL':<25} {sum(train_counts):>10} {sum(test_counts):>10} {sum(train_counts)+sum(test_counts):>10}")

plot_class_distribution(TRAIN_DIR, TEST_DIR, class_names)

# ## 4. Data Preprocessing and Augmentation


# Configuration
IMG_SIZE = (176, 208)  # Original MRI dimensions
BATCH_SIZE = 32
EPOCHS = 40
LEARNING_RATE = 0.0001

# Data augmentation for training
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=10,
    width_shift_range=0.1,
    height_shift_range=0.1,
    shear_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    fill_mode='nearest',
    validation_split=0.15
)

# Only rescaling for test
test_datagen = ImageDataGenerator(rescale=1./255)

# Create data generators
train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    shuffle=True
)

val_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    shuffle=False
)

test_generator = test_datagen.flow_from_directory(
    TEST_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=False
)

print(f"\n✅ Data generators created!")
print(f"Training samples: {train_generator.samples}")
print(f"Validation samples: {val_generator.samples}")
print(f"Test samples: {test_generator.samples}")
print(f"Class indices: {train_generator.class_indices}")
print(f"Number of classes: {train_generator.num_classes}")

# ## 5. Model Architecture - Transfer Learning with EfficientNetB0


def build_model(num_classes, input_shape=(176, 208, 3)):
    """Build Alzheimer's detection model using EfficientNetB0 transfer learning"""

    # Load pre-trained EfficientNetB0 model
    base_model = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=input_shape
    )

    # Freeze base model layers initially
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
        layers.Dropout(0.4),
        layers.Dense(128, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ])

    return model

# Build and compile model
NUM_CLASSES = train_generator.num_classes
INPUT_SHAPE = (IMG_SIZE[0], IMG_SIZE[1], 3)

model = build_model(NUM_CLASSES, INPUT_SHAPE)

model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE),
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.AUC(name='auc', multi_label=True)]
)

model.summary()

# ## 6. Model Training


# Define callbacks
callbacks = [
    EarlyStopping(
        monitor='val_loss',
        patience=8,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=4,
        min_lr=1e-7,
        verbose=1
    ),
    ModelCheckpoint(
        'alzheimer_model_best.keras',
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
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    # Accuracy
    axes[0].plot(history.history['accuracy'], label='Train', linewidth=2, color='#3498db')
    axes[0].plot(history.history['val_accuracy'], label='Validation', linewidth=2, color='#e74c3c')
    axes[0].set_title('Model Accuracy', fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Accuracy')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Loss
    axes[1].plot(history.history['loss'], label='Train', linewidth=2, color='#3498db')
    axes[1].plot(history.history['val_loss'], label='Validation', linewidth=2, color='#e74c3c')
    axes[1].set_title('Model Loss', fontsize=12, fontweight='bold')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Loss')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    # AUC
    axes[2].plot(history.history['auc'], label='Train', linewidth=2, color='#3498db')
    axes[2].plot(history.history['val_auc'], label='Validation', linewidth=2, color='#e74c3c')
    axes[2].set_title('Model AUC', fontsize=12, fontweight='bold')
    axes[2].set_xlabel('Epoch')
    axes[2].set_ylabel('AUC')
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)

    plt.suptitle('Training History - Alzheimer\'s Detection Model', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('alzheimer_training_history.png', dpi=300, bbox_inches='tight')
    plt.show()

plot_training_history(history)

# ## 8. Model Evaluation


# Load best model
model = keras.models.load_model('alzheimer_model_best.keras')

# Get class names in correct order
class_indices = train_generator.class_indices
idx_to_class = {v: k for k, v in class_indices.items()}
class_names_ordered = [idx_to_class[i] for i in range(len(idx_to_class))]
print(f"Class order: {class_names_ordered}")

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
y_pred = np.argmax(y_pred_prob, axis=1)
y_true = test_generator.classes

# Classification Report
print("\n" + "="*60)
print("CLASSIFICATION REPORT")
print("="*60)
print(classification_report(y_true, y_pred, target_names=[c.replace('_', ' ') for c in class_names_ordered]))

# Confusion Matrix
def plot_confusion_matrix(y_true, y_pred, classes):
    """Plot confusion matrix for multi-class"""
    cm = confusion_matrix(y_true, y_pred)

    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=[c.replace('_', ' ') for c in classes],
                yticklabels=[c.replace('_', ' ') for c in classes],
                annot_kws={'size': 12})
    plt.title('Confusion Matrix - Alzheimer\'s Detection', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig('alzheimer_confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()

    # Print per-class accuracy
    print("\nPer-class accuracy:")
    for i, cls in enumerate(classes):
        cls_total = np.sum(y_true == i)
        cls_correct = cm[i, i]
        accuracy = cls_correct / cls_total if cls_total > 0 else 0
        print(f"  {cls.replace('_', ' ')}: {accuracy:.4f} ({cls_correct}/{cls_total})")

plot_confusion_matrix(y_true, y_pred, class_names_ordered)

# Normalized Confusion Matrix
def plot_normalized_confusion_matrix(y_true, y_pred, classes):
    """Plot normalized confusion matrix"""
    cm = confusion_matrix(y_true, y_pred, normalize='true')

    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='.2%', cmap='YlOrRd',
                xticklabels=[c.replace('_', ' ') for c in classes],
                yticklabels=[c.replace('_', ' ') for c in classes],
                annot_kws={'size': 11})
    plt.title('Normalized Confusion Matrix - Alzheimer\'s Detection', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig('alzheimer_normalized_confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()

plot_normalized_confusion_matrix(y_true, y_pred, class_names_ordered)

# ROC Curves for Multi-class
def plot_multiclass_roc_curves(y_true, y_pred_prob, classes):
    """Plot ROC curves for each class"""
    y_true_bin = label_binarize(y_true, classes=range(len(classes)))

    plt.figure(figsize=(10, 8))
    colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c']

    auc_scores = []
    for i, (cls, color) in enumerate(zip(classes, colors)):
        fpr, tpr, _ = roc_curve(y_true_bin[:, i], y_pred_prob[:, i])
        roc_auc = auc(fpr, tpr)
        auc_scores.append(roc_auc)
        plt.plot(fpr, tpr, color=color, lw=2,
                label=f'{cls.replace("_", " ")} (AUC = {roc_auc:.4f})')

    plt.plot([0, 1], [0, 1], 'k--', lw=2, label='Random Classifier')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title('ROC Curves - Alzheimer\'s Detection (One-vs-Rest)', fontsize=14, fontweight='bold')
    plt.legend(loc='lower right')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('alzheimer_roc_curves.png', dpi=300, bbox_inches='tight')
    plt.show()

    return auc_scores

auc_scores = plot_multiclass_roc_curves(y_true, y_pred_prob, class_names_ordered)

# Per-class metrics visualization
def plot_per_class_metrics(y_true, y_pred, classes):
    """Plot per-class precision, recall, f1-score"""
    precision = precision_score(y_true, y_pred, average=None)
    recall = recall_score(y_true, y_pred, average=None)
    f1 = f1_score(y_true, y_pred, average=None)

    x = np.arange(len(classes))
    width = 0.25

    fig, ax = plt.subplots(figsize=(14, 6))

    bars1 = ax.bar(x - width, precision, width, label='Precision', color='#3498db')
    bars2 = ax.bar(x, recall, width, label='Recall', color='#2ecc71')
    bars3 = ax.bar(x + width, f1, width, label='F1-Score', color='#e74c3c')

    ax.set_xlabel('Class', fontsize=12)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_title('Per-Class Metrics - Alzheimer\'s Detection', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels([c.replace('_', '\n') for c in classes])
    ax.legend()
    ax.set_ylim([0, 1.15])
    ax.grid(True, alpha=0.3, axis='y')

    # Add value labels
    for bars in [bars1, bars2, bars3]:
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.2f}',
                       xy=(bar.get_x() + bar.get_width()/2, height),
                       ha='center', va='bottom', fontsize=8)

    plt.tight_layout()
    plt.savefig('alzheimer_per_class_metrics.png', dpi=300, bbox_inches='tight')
    plt.show()

plot_per_class_metrics(y_true, y_pred, class_names_ordered)

# Comprehensive metrics summary
def print_metrics_summary(y_true, y_pred, y_pred_prob, classes, auc_scores):
    """Print comprehensive metrics summary"""
    print("\n" + "="*70)
    print("COMPREHENSIVE METRICS SUMMARY - ALZHEIMER'S DETECTION")
    print("="*70)

    accuracy = accuracy_score(y_true, y_pred)
    precision_macro = precision_score(y_true, y_pred, average='macro')
    precision_weighted = precision_score(y_true, y_pred, average='weighted')
    recall_macro = recall_score(y_true, y_pred, average='macro')
    recall_weighted = recall_score(y_true, y_pred, average='weighted')
    f1_macro = f1_score(y_true, y_pred, average='macro')
    f1_weighted = f1_score(y_true, y_pred, average='weighted')

    print(f"\n{'OVERALL METRICS':^70}")
    print("-"*70)
    print(f"{'Accuracy':<30s}: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"{'Precision (Macro)':<30s}: {precision_macro:.4f}")
    print(f"{'Precision (Weighted)':<30s}: {precision_weighted:.4f}")
    print(f"{'Recall (Macro)':<30s}: {recall_macro:.4f}")
    print(f"{'Recall (Weighted)':<30s}: {recall_weighted:.4f}")
    print(f"{'F1-Score (Macro)':<30s}: {f1_macro:.4f}")
    print(f"{'F1-Score (Weighted)':<30s}: {f1_weighted:.4f}")
    print(f"{'Mean AUC':<30s}: {np.mean(auc_scores):.4f}")

    # Per-class metrics
    print(f"\n{'PER-CLASS METRICS':^70}")
    print("-"*70)
    print(f"{'Class':<25s} {'Precision':>12s} {'Recall':>12s} {'F1-Score':>12s} {'AUC':>10s}")
    print("-"*70)

    precision_per = precision_score(y_true, y_pred, average=None)
    recall_per = recall_score(y_true, y_pred, average=None)
    f1_per = f1_score(y_true, y_pred, average=None)

    for i, cls in enumerate(classes):
        print(f"{cls.replace('_', ' '):<25s} {precision_per[i]:>12.4f} {recall_per[i]:>12.4f} {f1_per[i]:>12.4f} {auc_scores[i]:>10.4f}")

    print("="*70)

print_metrics_summary(y_true, y_pred, y_pred_prob, class_names_ordered, auc_scores)

# ## 9. Save Model


# Save final model
model.save('alzheimer_model.keras')
print("✅ Model saved as 'alzheimer_model.keras'")

# Save class mapping
import json
with open('alzheimer_class_mapping.json', 'w') as f:
    json.dump(class_indices, f)
print("✅ Class mapping saved!")

# Download files
from google.colab import files
files.download('alzheimer_model.keras')
files.download('alzheimer_class_mapping.json')
files.download('alzheimer_training_history.png')
files.download('alzheimer_confusion_matrix.png')
files.download('alzheimer_normalized_confusion_matrix.png')
files.download('alzheimer_roc_curves.png')
files.download('alzheimer_per_class_metrics.png')

# ## 10. Sample Predictions Visualization


def visualize_predictions(model, generator, class_names, n_samples=12):
    """Visualize sample predictions"""
    generator.reset()
    batch = next(generator)
    images, labels = batch

    predictions = model.predict(images[:n_samples], verbose=0)

    n_cols = 4
    n_rows = (n_samples + n_cols - 1) // n_cols
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(14, 4*n_rows))
    axes = axes.flatten()

    for i in range(n_samples):
        ax = axes[i]
        ax.imshow(images[i])

        pred_class = np.argmax(predictions[i])
        true_class = np.argmax(labels[i])
        confidence = predictions[i][pred_class]

        color = 'green' if pred_class == true_class else 'red'

        ax.set_title(f'True: {class_names[true_class].replace("_", " ")}\n'
                    f'Pred: {class_names[pred_class].replace("_", " ")}\n'
                    f'Conf: {confidence*100:.1f}%',
                    color=color, fontsize=9)
        ax.axis('off')

    # Hide empty subplots
    for i in range(n_samples, len(axes)):
        axes[i].axis('off')

    plt.suptitle('Sample Predictions - Alzheimer\'s Detection', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('alzheimer_sample_predictions.png', dpi=300, bbox_inches='tight')
    plt.show()

visualize_predictions(model, test_generator, class_names_ordered)

# ## Summary
# 
# This notebook trained an Alzheimer's disease detection model using:
# - **Dataset**: Kaggle Alzheimer's Dataset (4 classes)
# - **Architecture**: EfficientNetB0 with transfer learning
# - **Input**: 176x208 RGB MRI images
# - **Output**: 4-class classification (Non Demented, Very Mild, Mild, Moderate)
# 
# The model has been saved as `alzheimer_model.keras` and can be deployed in the HealthMate ML service.
# 
# ### Key Findings:
# - Model successfully distinguishes between different stages of dementia
# - Transfer learning from EfficientNetB0 provides good feature extraction
# - Class weights help handle imbalanced dataset
# - Data augmentation improves generalization