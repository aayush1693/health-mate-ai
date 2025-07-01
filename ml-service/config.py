import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Google Gemini API
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    FILE_SEARCH_STORE_NAME = os.getenv('FILE_SEARCH_STORE_NAME', 'fileSearchStores/q2mobcvwaw6o-he597702gur3')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash-lite')
    
    # Model Paths
    PNEUMONIA_MODEL_PATH = os.getenv('PNEUMONIA_MODEL_PATH', 'models/pneumonia_model.keras')
    LUNG_CANCER_MODEL_PATH = os.getenv('LUNG_CANCER_MODEL_PATH', 'models/lung_cancer_model.keras')
    ALZHEIMER_MODEL_PATH = os.getenv('ALZHEIMER_MODEL_PATH', 'models/alzheimer_model.keras')
    
    # Server
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Upload settings
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'dcm'}
    
    # Model input sizes
    MODEL_INPUT_SIZES = {
        'pneumonia': (224, 224),
        'lung_cancer': (224, 224),
        'alzheimer': (176, 208)
    }
    
    # Class labels
    CLASS_LABELS = {
        'pneumonia': ['Normal', 'Pneumonia'],
        'lung_cancer': ['Benign', 'Malignant', 'Normal'],
        'alzheimer': ['Mild Demented', 'Moderate Demented', 'Non Demented', 'Very Mild Demented']
    }
    
    # Medical textbooks reference (for display/documentation)
    MEDICAL_TEXTBOOKS = [
        'The Merck Manual of Diagnosis & Therapy (19th Edition)',
        'Guyton and Hall Textbook of Medical Physiology (13th Edition)',
        'Robbins Pathologic Basis of Disease (Pocket Companion)',
        "Harrison's Principles of Internal Medicine"
    ]

config = Config()