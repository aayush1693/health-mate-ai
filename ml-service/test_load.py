import os
import keras
import numpy as np

def build_pneumonia_model():
    base_model = keras.applications.VGG16(weights=None, include_top=False, input_shape=(224, 224, 3))
    model = keras.models.Sequential([
        keras.layers.Input(shape=(224, 224, 3)),
        base_model,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.Dense(512, activation='relu'),
        keras.layers.BatchNormalization(),
        keras.layers.Dropout(0.5),
        keras.layers.Dense(256, activation='relu'),
        keras.layers.BatchNormalization(),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(1, activation='sigmoid')
    ])
    return model

model_path = 'models/pneumonia_model.keras'
if os.path.exists(model_path):
    try:
        model = build_pneumonia_model()
        model.load_weights(model_path)
        print("Successfully loaded pneumonia weights manually")
        model.summary()
    except Exception as e:
        print(f"Failed to load pneumonia weights manually: {e}")
        
    try:
        model = keras.models.load_model(model_path, compile=False)
        print("Successfully loaded pneumonia model directly")
    except Exception as e:
        print(f"Failed to load pneumonia model directly: {e}")
else:
    print(f"Model path {model_path} does not exist")