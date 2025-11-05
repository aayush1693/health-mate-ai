# HealthMate AI - ML Models Directory

This directory contains the trained Keras models for disease detection.

## Required Models

Place the following trained models in this directory:

1. **pneumonia_model.keras**
   - Trained on: Chest X-Ray images
   - Classes: Normal, Pneumonia
   - Input size: 224x224 RGB

2. **lung_cancer_model.keras**
   - Trained on: CT Scan images
   - Classes: Benign, Malignant, Normal
   - Input size: 224x224 RGB

3. **alzheimer_model.keras**
   - Trained on: Brain MRI images
   - Classes: Non Demented, Very Mild, Mild, Moderate Demented
   - Input size: 176x208 RGB

## Training

Use the Jupyter notebooks in the `/notebooks` directory to train these models:

1. `pneumonia_detection_training.ipynb`
2. `lung_cancer_detection_training.ipynb`
3. `alzheimer_detection_training.ipynb`

## Model Download (If Available)

If trained models are available for download, place them in this directory with the exact filenames mentioned above.

## Note

- The ML service will still work without models (returns mock predictions)
- For production use, train and add all models
- Each model file should be in `.keras` format (Keras 3.0+)
