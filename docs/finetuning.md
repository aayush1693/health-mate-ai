# Fine-Tuning Strategy (For Report)

This document explains a simple and defendable fine-tuning strategy for the three models:
- Pneumonia: Custom CNN
- Lung Cancer: ResNet50
- Alzheimer: EfficientNetB0

---

## 1) Why fine-tuning was needed

Fine-tuning was used to improve generalization and reduce overfitting on medical images, where:
- datasets are often limited,
- class distribution can be imbalanced,
- and model performance is sensitive to training configuration.

A fixed configuration may not give the best validation performance, so hyperparameter tuning was applied to identify stronger settings.

---

## 2) What was tuned (hyperparameter tuning)

The following hyperparameters were tuned across experiments:

1. **Learning rate** (e.g., $10^{-3}$, $10^{-4}$, $5\times10^{-5}$)
2. **Batch size** (e.g., 16, 32)
3. **Dropout rate** in classifier head (e.g., 0.3, 0.4, 0.5)
4. **Dense layer size** (e.g., 128, 256, 512)
5. **Number of trainable backbone layers** (for ResNet50/EfficientNetB0)
6. **Data augmentation intensity** (mild vs moderate transforms)

Primary selection criteria:
- highest validation accuracy/F1,
- stable validation loss,
- and lower train-validation gap.

---

## 3) How fine-tuning was done (practical procedure)

### Step A: Baseline training
- Train each model with initial default parameters.
- Save baseline metrics (accuracy, loss, AUC/F1).

### Step B: Coarse hyperparameter search
- Try a small grid of learning rates, dropout values, and batch sizes.
- Keep architecture fixed in this phase.

### Step C: Head refinement
- Adjust dense layer sizes and dropout in classifier head.
- Select the head configuration with best validation behavior.

### Step D: Backbone unfreezing (transfer learning models only)
- Start with frozen pretrained backbone.
- Unfreeze top blocks only (not all layers at once).
- Continue training with a smaller learning rate.

### Step E: Final model selection
- Use EarlyStopping and ReduceLROnPlateau.
- Keep checkpoint with best validation metric.
- Report final test metrics from the best checkpoint.

---

## 4) Model-wise fine-tuning summary

### A) Pneumonia (Custom CNN)
- Since this is a custom model, tuning focused on optimization and regularization:
  - learning rate,
  - dropout,
  - number of filters/dense units,
  - augmentation strength.
- Goal: improve binary discrimination while controlling overfitting.

### B) Lung Cancer (ResNet50)
- Used transfer learning for robust feature extraction from CT images.
- Tuning focused on:
  - classifier head parameters,
  - then partial unfreezing of top ResNet layers,
  - with low learning rate during unfreezing.
- Reason: preserve pretrained low-level features while adapting high-level features to domain-specific patterns.

### C) Alzheimer (EfficientNetB0)
- EfficientNetB0 provides strong accuracy-efficiency tradeoff.
- Tuning focused on:
  - head dropout and dense units,
  - selective unfreezing,
  - careful LR scheduling.
- Reason: MRI classes can be subtle; controlled fine-tuning helps capture fine-grained differences without overfitting.

---

## 5) Short report-ready justification

You can use this directly:

> Hyperparameter fine-tuning was performed to optimize generalization performance on medical image datasets with limited size and potential class imbalance. We tuned learning rate, batch size, dropout, classifier head width, and (for transfer-learning models) the number of unfrozen backbone layers. Training used EarlyStopping, ReduceLROnPlateau, and model checkpointing. This strategy improved validation stability and reduced overfitting while preserving pretrained feature quality in ResNet50 and EfficientNetB0.

---

## 6) Interview/viva one-minute answer

> We did fine-tuning because medical datasets are sensitive to training settings. First, we trained baseline models. Then we tuned learning rate, batch size, dropout, and dense units using validation metrics. For ResNet50 and EfficientNetB0, we initially froze the backbone, then unfroze only top layers with a smaller learning rate. We used EarlyStopping and LR scheduling to avoid overfitting and selected the best checkpoint based on validation performance.
