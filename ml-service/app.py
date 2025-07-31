import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import config
from services import detector, chatbot, recommendation_engine
import logging
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from flask_sock import Sock

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH
app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER

# Configure CORS
CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)
sock = Sock(app)

# Ensure upload directory exists
os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS

# ==================== Live Chat WebSocket ====================

@sock.route('/api/live/chat')
def live_chat_socket(ws):
    """WebSocket endpoint for Gemini Live Chat"""
    from services.live_gemini import handle_live_chat_connection
    handle_live_chat_connection(ws)

# ==================== Health Check ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'UP',
        'service': 'HealthMate ML Service',
        'version': '1.0.0',
        'models_available': detector.get_available_models()
    })

# ==================== Disease Detection ====================

@app.route('/api/predict', methods=['POST'])
def predict_disease():
    """
    Predict disease from uploaded medical image
    
    Expected form data:
    - file: The medical image file
    - model_type: Type of model (pneumonia, lung_cancer, alzheimer)
    """
    try:
        # Validate file
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(config.ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Get model type
        model_type = request.form.get('model_type', 'pneumonia')
        
        if model_type not in ['pneumonia', 'lung_cancer', 'alzheimer']:
            return jsonify({
                'success': False,
                'error': 'Invalid model type. Use: pneumonia, lung_cancer, or alzheimer'
            }), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(config.UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        
        logger.info(f"Processing {model_type} prediction for file: {filename}")
        
        # Make prediction
        result = detector.predict(filepath, model_type)
        
        # Clean up file
        try:
            os.remove(filepath)
        except Exception as e:
            logger.warning(f"Failed to remove temp file: {e}")
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/models', methods=['GET'])
def get_available_models():
    """Get list of available models and their info"""
    models_info = {
        'pneumonia': {
            'name': 'Pneumonia Detection',
            'description': 'Detects pneumonia from chest X-ray images',
            'input_type': 'Chest X-Ray',
            'classes': config.CLASS_LABELS['pneumonia'],
            'available': detector.is_model_available('pneumonia')
        },
        'lung_cancer': {
            'name': 'Lung Cancer Detection',
            'description': 'Detects lung cancer from CT scan images',
            'input_type': 'CT Scan',
            'classes': config.CLASS_LABELS['lung_cancer'],
            'available': detector.is_model_available('lung_cancer')
        },
        'alzheimer': {
            'name': 'Alzheimer\'s Detection',
            'description': 'Detects stages of Alzheimer\'s from MRI images',
            'input_type': 'Brain MRI',
            'classes': config.CLASS_LABELS['alzheimer'],
            'available': detector.is_model_available('alzheimer')
        }
    }
    
    return jsonify({
        'success': True,
        'models': models_info
    })

# ==================== Chat ====================

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Chat with HealthMate AI using RAG (Retrieval Augmented Generation)
    
    Supports both JSON and multipart/form-data (for image uploads)
    
    Expected Data:
    - message: User's message
    - session_id: (optional) Session ID for conversation continuity
    - file: (optional) Image file for visual analysis
    """
    image_path = None
    try:
        # Handle multipart/form-data (with file)
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            message = request.form.get('message', '').strip()
            session_id = request.form.get('session_id', str(uuid.uuid4()))
            use_rag = request.form.get('use_rag', 'true').lower() == 'true'
            
            if 'file' in request.files:
                file = request.files['file']
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    image_path = os.path.join(config.UPLOAD_FOLDER, unique_filename)
                    file.save(image_path)
                    logger.info(f"Image uploaded for chat: {filename}")
        
        # Handle JSON (text only)
        else:
            data = request.get_json()
            if not data or 'message' not in data:
                return jsonify({
                    'success': False,
                    'error': 'Message is required'
                }), 400
            
            message = data['message'].strip()
            session_id = data.get('session_id', str(uuid.uuid4()))
            use_rag = data.get('use_rag', True)
        
        if not message and not image_path:
            return jsonify({
                'success': False,
                'error': 'Message or image is required'
            }), 400
        
        logger.info(f"Chat request - Session: {session_id}, Message: {message[:50]}..., RAG: {use_rag}")
        
        # Use the new RAG-based chatbot
        result = chatbot.chat(message, session_id, image_path, use_rag=use_rag)
        
        # Clean up uploaded file
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except Exception as e:
                logger.warning(f"Failed to remove temp chat file: {e}")
                
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        # Clean up on error
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except Exception:
                pass
                
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/suggestions', methods=['GET'])
def get_chat_suggestions():
    """Get suggested medical questions for the chat"""
    suggestions = [
        "What is hypertension and how is it treated?",
        "Explain the pathophysiology of diabetes",
        "What are the symptoms of heart failure?",
        "How does the respiratory system work?",
        "What causes pneumonia?",
        "Explain the function of kidneys",
        "What are the stages of Alzheimer's disease?",
        "How is lung cancer diagnosed?",
        "What are the risk factors for cardiovascular disease?",
        "Explain the symptoms of anemia"
    ]
    
    return jsonify({
        'success': True,
        'suggestions': suggestions
    })

@app.route('/api/chat/clear', methods=['POST'])
def clear_chat_history():
    """Clear chat history for a session"""
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        chatbot.clear_history(session_id)
        
        return jsonify({
            'success': True,
            'message': 'Chat history cleared'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== Recommendations ====================

@app.route('/api/recommendations/hospitals', methods=['GET'])
def get_hospitals():
    """
    Get hospital recommendations
    
    Query params:
    - specialty: Filter by specialty
    - city: Filter by city
    - emergency: Filter by emergency availability (true/false)
    - lat: User latitude for distance calculation
    - lng: User longitude for distance calculation
    - limit: Max results (default 10)
    """
    try:
        specialty = request.args.get('specialty')
        city = request.args.get('city')
        needs_emergency = request.args.get('emergency', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 10))
        
        user_coords = None
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        if lat and lng:
            user_coords = {'lat': float(lat), 'lng': float(lng)}
        
        result = recommendation_engine.get_hospitals(
            user_coords=user_coords,
            specialty=specialty,
            needs_emergency=needs_emergency,
            city=city,
            limit=limit
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Hospital recommendation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/recommendations/hospitals/<hospital_id>', methods=['GET'])
def get_hospital_by_id(hospital_id):
    """Get hospital details by ID"""
    result = recommendation_engine.get_hospital_by_id(hospital_id)
    if result['success']:
        return jsonify(result)
    return jsonify(result), 404

@app.route('/api/recommendations/doctors', methods=['GET'])
def get_doctors():
    """
    Get doctor recommendations
    
    Query params:
    - specialty: Filter by specialty
    - hospital_id: Filter by hospital
    - min_experience: Minimum years of experience
    - max_fee: Maximum consultation fee
    - limit: Max results (default 10)
    """
    try:
        specialty = request.args.get('specialty')
        hospital_id = request.args.get('hospital_id')
        min_experience = int(request.args.get('min_experience', 0))
        max_fee = request.args.get('max_fee')
        if max_fee:
            max_fee = int(max_fee)
        limit = int(request.args.get('limit', 10))
        
        result = recommendation_engine.get_doctors(
            specialty=specialty,
            hospital_id=hospital_id,
            min_experience=min_experience,
            max_fee=max_fee,
            limit=limit
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Doctor recommendation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/recommendations/doctors/<doctor_id>', methods=['GET'])
def get_doctor_by_id(doctor_id):
    """Get doctor details by ID"""
    result = recommendation_engine.get_doctor_by_id(doctor_id)
    if result['success']:
        return jsonify(result)
    return jsonify(result), 404

@app.route('/api/recommendations/specialties', methods=['GET'])
def get_specialties():
    """Get all available specialties"""
    return jsonify(recommendation_engine.get_all_specialties())

@app.route('/api/recommendations/for-condition', methods=['POST'])
def get_recommendations_for_condition():
    """
    Get recommendations based on detected condition
    
    Expected JSON:
    - condition: The detected condition (e.g., 'Pneumonia', 'Malignant')
    - lat: (optional) User latitude
    - lng: (optional) User longitude
    """
    try:
        data = request.get_json()
        
        if not data or 'condition' not in data:
            return jsonify({
                'success': False,
                'error': 'Condition is required'
            }), 400
        
        condition = data['condition']
        user_coords = None
        
        if 'lat' in data and 'lng' in data:
            user_coords = {'lat': float(data['lat']), 'lng': float(data['lng'])}
        
        result = recommendation_engine.get_recommendations_for_condition(
            condition=condition,
            user_coords=user_coords
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Condition recommendation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Resource not found'
    }), 404

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {config.MAX_CONTENT_LENGTH // (1024 * 1024)}MB'
    }), 413

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

# ==================== Main ====================

if __name__ == '__main__':
    logger.info(f"Starting HealthMate ML Service on {config.HOST}:{config.PORT}")
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
