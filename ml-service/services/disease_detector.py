import os
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.applications import VGG16, ResNet50, EfficientNetB0
from config import config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiseaseDetector:
    """Handles disease detection using pre-trained models"""
    
    def __init__(self):
        self.models = {}
        self._load_models()
    
    def _build_pneumonia_model(self):
        base_model = VGG16(weights=None, include_top=False, input_shape=(224, 224, 3))
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

    def _build_lung_cancer_model(self):
        base_model = ResNet50(weights=None, include_top=False, input_shape=(224, 224, 3))
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
            layers.Dropout(0.3),
            layers.Dense(3, activation='softmax')
        ])
        return model

    def _build_alzheimer_model(self):
        # Note: EfficientNetB0 expects input shape (224, 224, 3) usually, but we use (176, 208, 3) per training
        base_model = EfficientNetB0(weights=None, include_top=False, input_shape=(176, 208, 3))
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
            layers.Dense(4, activation='softmax')
        ])
        return model

    def _load_models(self):
        """Load all available models by building architecture and loading weights"""
        
        loaders = {
            'pneumonia': self._build_pneumonia_model,
            'lung_cancer': self._build_lung_cancer_model,
            'alzheimer': self._build_alzheimer_model
        }
        
        model_paths = {
            'pneumonia': config.PNEUMONIA_MODEL_PATH,
            'lung_cancer': config.LUNG_CANCER_MODEL_PATH,
            'alzheimer': config.ALZHEIMER_MODEL_PATH
        }
        
        for model_name, builder in loaders.items():
            model_path = model_paths.get(model_name)
            if model_path and os.path.exists(model_path):
                try:
                    # Build architecture
                    model = builder()
                    
                    # Initialize model variables by running a dummy input
                    # This is crucial for fixing "Layer ... was never built" errors
                    h, w = config.MODEL_INPUT_SIZES[model_name]
                    dummy_input = tf.zeros((1, h, w, 3))
                    model(dummy_input)

                    # Load weights from .keras file
                    # We use by_name=False (default) assuming topology matches, 
                    # but if names in saved model mismatch generated ones, this might be tricky.
                    # Given it's a Sequential model, topology loading usually works for .h5, 
                    # but .keras is stricter. Let's try standard load_weights.
                    model.load_weights(model_path)
                    
                    self.models[model_name] = model
                    logger.info(f"Successfully loaded {model_name} model from {model_path}.")
                except Exception as e:
                    logger.error(f"Failed to load {model_name} model: {str(e)}")
            else:
                logger.warning(f"Model file not found: {model_path}")
    
    def preprocess_image(self, image_path: str, model_type: str) -> np.ndarray:
        """Preprocess image for model prediction"""
        target_size = config.MODEL_INPUT_SIZES.get(model_type, (224, 224))
        
        # Load and resize image
        img = Image.open(image_path)
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize
        img = img.resize(target_size)
        
        # Convert to array and normalize
        img_array = np.array(img) / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def predict(self, image_path: str, model_type: str) -> dict:
        """Make prediction using specified model"""
        
        if model_type not in self.models:
            # Return mock data if model not loaded (for development)
            return self._get_mock_prediction(model_type)
        
        try:
            # Preprocess image
            img_array = self.preprocess_image(image_path, model_type)
            
            # Make prediction
            model = self.models[model_type]
            predictions = model.predict(img_array, verbose=0)
            
            # Get class labels
            class_labels = config.CLASS_LABELS.get(model_type, [])
            
            # Format results
            results = []
            
            # Handle binary vs multi-class
            if len(class_labels) == 2 and predictions.shape[1] == 1:
                # Binary classification with sigmoid output
                prob = float(predictions[0][0])
                results.append({'label': class_labels[1], 'confidence': prob * 100})
                results.append({'label': class_labels[0], 'confidence': (1 - prob) * 100})
            else:
                # Multi-class or binary with 2 output neurons
                for i, label in enumerate(class_labels):
                    if i < predictions.shape[1]:
                        results.append({
                            'label': label,
                            'confidence': float(predictions[0][i]) * 100
                        })
            
            # Sort by confidence
            results.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Get primary prediction
            primary = results[0]
            
            return {
                'success': True,
                'model_type': model_type,
                'prediction': primary['label'],
                'confidence': round(primary['confidence'], 2),
                'all_predictions': results,
                'recommendation': self._get_recommendation(model_type, primary['label'], primary['confidence'])
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_mock_prediction(self, model_type: str) -> dict:
        """Generate mock prediction for development/testing"""
        import random
        
        class_labels = config.CLASS_LABELS.get(model_type, ['Unknown'])
        
        # Generate random probabilities that sum to 1
        probs = [random.random() for _ in class_labels]
        total = sum(probs)
        probs = [p / total for p in probs]
        
        results = []
        for label, prob in zip(class_labels, probs):
            results.append({
                'label': label,
                'confidence': round(prob * 100, 2)
            })
        
        results.sort(key=lambda x: x['confidence'], reverse=True)
        primary = results[0]
        
        return {
            'success': True,
            'model_type': model_type,
            'prediction': primary['label'],
            'confidence': primary['confidence'],
            'all_predictions': results,
            'recommendation': self._get_recommendation(model_type, primary['label'], primary['confidence']),
            'mock_data': True
        }
    
    def _get_recommendation(self, model_type: str, prediction: str, confidence: float) -> str:
        """Generate recommendation based on prediction"""
        
        recommendations = {
            'pneumonia': {
                'Normal': "Your chest X-ray appears normal. Continue maintaining good respiratory health with regular exercise and avoiding smoking.",
                'Pneumonia': "Signs of pneumonia detected. Please consult a pulmonologist immediately for proper diagnosis and treatment. Early treatment is crucial for recovery."
            },
            'lung_cancer': {
                'Normal': "Your CT scan appears normal. Continue regular health checkups and avoid smoking and exposure to harmful substances.",
                'Benign': "A benign growth was detected. While not cancerous, please consult an oncologist for monitoring and to rule out any concerns.",
                'Malignant': "Potential malignant findings detected. Please seek immediate consultation with an oncologist for further evaluation and treatment planning."
            },
            'alzheimer': {
                'Non Demented': "No signs of dementia detected. Maintain cognitive health through mental exercises, social activities, and a healthy lifestyle.",
                'Very Mild Demented': "Very mild cognitive changes detected. Consider consulting a neurologist for baseline assessment and lifestyle recommendations.",
                'Mild Demented': "Mild dementia signs detected. Please consult a neurologist for comprehensive evaluation and care planning.",
                'Moderate Demented': "Moderate dementia signs detected. Immediate consultation with a neurologist is recommended for treatment and care management."
            }
        }
        
        base_rec = recommendations.get(model_type, {}).get(prediction, "Please consult a healthcare professional for proper evaluation.")
        
        if confidence < 70:
            base_rec += f" Note: Confidence level is {confidence}%. Consider getting a second opinion or additional tests."
        
        return base_rec
    
    def get_available_models(self) -> list:
        """Get list of available loaded models"""
        return list(self.models.keys())
    
    def is_model_available(self, model_type: str) -> bool:
        """Check if a specific model is available"""
        return model_type in self.models

# Create singleton instance
detector = DiseaseDetector()
