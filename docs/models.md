# HealthMate AI Models Documentation

This document describes the 3 disease-detection models used by the project, including inputs, architecture, training setup, classes, inference behavior, and deployment notes.

## 1) Model inventory

| Model key | Clinical task | Input modality | Input size | Output type | Output classes |
|---|---|---|---|---|---|
| `pneumonia` | Detect pneumonia from chest X-ray | Chest X-ray image | `224 x 224 x 3` | Binary sigmoid (`Dense(1)`) | `Normal`, `Pneumonia` |
| `lung_cancer` | Detect lung cancer category from CT | CT scan image | `224 x 224 x 3` | Multi-class softmax (`Dense(3)`) | `Benign`, `Malignant`, `Normal` |
| `alzheimer` | Detect Alzheimer stage from MRI | Brain MRI image | `176 x 208 x 3` | Multi-class softmax (`Dense(4)`) | `Mild Demented`, `Moderate Demented`, `Non Demented`, `Very Mild Demented` |

---

## 2) Architecture details

### A) Pneumonia model

- Backbone: `VGG16(include_top=False, weights='imagenet' during training)`
- Transfer-learning head:
  - `GlobalAveragePooling2D`
  - `Dense(512, relu)` + `BatchNormalization` + `Dropout(0.5)`
  - `Dense(256, relu)` + `BatchNormalization` + `Dropout(0.3)`
  - `Dense(1, sigmoid)`
- Loss: `binary_crossentropy`
- Optimizer: `Adam(learning_rate=1e-4)`
- Metrics during training notebook: `accuracy`, `AUC`, `Precision`, `Recall`

### B) Lung cancer model

- Backbone: `ResNet50(include_top=False, weights='imagenet' during training)`
- Transfer-learning head:
  - `GlobalAveragePooling2D`
  - `Dense(512, relu)` + `BatchNormalization` + `Dropout(0.5)`
  - `Dense(256, relu)` + `BatchNormalization` + `Dropout(0.4)`
  - `Dense(128, relu)` + `Dropout(0.3)`
  - `Dense(3, softmax)`
- Loss: `categorical_crossentropy`
- Optimizer: `Adam(learning_rate=1e-4)`
- Metrics during training notebook: `accuracy`, `AUC (one-vs-rest style via multi-label AUC metric)`

### C) Alzheimer model

- Backbone: `EfficientNetB0(include_top=False, weights='imagenet' during training)`
- Transfer-learning head:
  - `GlobalAveragePooling2D`
  - `Dense(512, relu)` + `BatchNormalization` + `Dropout(0.5)`
  - `Dense(256, relu)` + `BatchNormalization` + `Dropout(0.4)`
  - `Dense(128, relu)` + `BatchNormalization` + `Dropout(0.3)`
  - `Dense(4, softmax)`
- Loss: `categorical_crossentropy`
- Optimizer: `Adam(learning_rate=1e-4)`
- Metrics during training notebook: `accuracy`, `AUC (multi-class one-vs-rest style)`

---

## 3) Data and preprocessing

## Pneumonia

- Dataset source in training notebook: Kaggle `paultimothymooney/chest-xray-pneumonia`
- Folders: `train`, `val`, `test`
- Augmentation (train only): rotation, width/height shift, shear, zoom, horizontal flip
- Scaling: divide pixel values by `255`

## Lung cancer

- Dataset source in training notebook: Kaggle `mohamedhanyyy/chest-ctscan-images`
- Split structure uses `train`, `valid`, `test`
- Augmentation (train only): rotation, width/height shift, shear, zoom, horizontal flip
- Scaling: divide pixel values by `255`

## Alzheimer

- Dataset source in training notebook: Kaggle `preetpalsingh25/alzheimers-dataset-4-class-of-images`
- Folders: `train`, `test` with train-time validation split (`validation_split=0.15`)
- Augmentation (train only): rotation, shifts, shear, zoom, horizontal flip
- Scaling: divide pixel values by `255`

---

## 4) Regularization and anti-overfitting strategy

All three training notebooks apply the same anti-overfitting pattern:

- Frozen pretrained backbone for initial transfer-learning phase
- `Dropout` in the dense head
- `BatchNormalization` in dense layers
- `EarlyStopping` with `restore_best_weights=True`
- `ReduceLROnPlateau` to lower LR when validation loss plateaus
- `ModelCheckpoint` to keep best model (val-accuracy monitored)
- `compute_class_weight(..., class_weight='balanced')` to reduce class-imbalance bias

---

## 5) Training hyperparameters

| Model | Image size | Batch size | Epochs (max) | Learning rate |
|---|---|---:|---:|---:|
| Pneumonia | `224x224` | 32 | 30 | 0.0001 |
| Lung cancer | `224x224` | 32 | 30 | 0.0001 |
| Alzheimer | `176x208` | 32 | 40 | 0.0001 |

---

## 6) Evaluation used in notebooks

Each notebook includes or computes:

- Training/validation curves: accuracy, loss, and AUC
- Confusion matrix
- Precision, recall, F1 (macro/weighted and per-class)
- ROC and AUC
  - Binary ROC for pneumonia
  - One-vs-rest ROC for multi-class models
- Saved figures and downloadable artifacts in Colab (`files.download(...)`)

---

## 7) Inference-time implementation in this project

`ml-service/services/disease_detector.py` builds architecture and loads model weights from:

- `models/pneumonia_model.keras`
- `models/lung_cancer_model.keras`
- `models/alzheimer_model.keras`

Runtime inference steps:

1. Read image with PIL
2. Convert to RGB if needed
3. Resize to per-model input size from config
4. Normalize to `[0,1]`
5. Add batch dimension
6. Run model prediction
7. Return sorted class confidences and top prediction

If a model file is missing or load fails, the service can return mock predictions for development.

---

## 8) Output schema returned by prediction endpoint

The response includes:

- `success`
- `model_type`
- `prediction` (top class)
- `confidence` (top confidence %)
- `all_predictions` (class-wise confidences)
- `recommendation` (rule-based clinical guidance text)

---

## 9) Class mapping notes

- Deployed class labels are controlled by `config.CLASS_LABELS` in `ml-service/config.py`.
- `training/alzheimer/alzheimer_class_mapping.json` is consistent with Alzheimer labels.
- `training/lung-cancer/lung_cancer_class_mapping.json` currently stores split labels (`test/train/valid`) rather than medical class names, so production class names should be taken from `config.CLASS_LABELS['lung_cancer']` and the model training folder structure.

---

## 10) Files referenced

- `ml-service/services/disease_detector.py`
- `ml-service/config.py`
- `notebooks/pneumonia_detection_training_v1.py`
- `notebooks/lung_cancer_detection_training.py`
- `notebooks/alzheimer_detection_training_v1.py`
- `training/alzheimer/alzheimer_class_mapping.json`
- `training/lung-cancer/lung_cancer_class_mapping.json`
