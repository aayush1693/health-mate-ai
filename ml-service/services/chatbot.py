"""
HealthMate AI Chatbot Service with RAG
Uses ChromaDB + Gemini for medical knowledge retrieval
"""

import logging
from google import genai
from google.genai import types
from config import config
import PIL.Image
from services.rag_service import rag_service
from services.translation_service import translation_service

logger = logging.getLogger(__name__)

# Initialize Gemini client
try:
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    logger.info("Gemini client initialized successfully in Chatbot")
except Exception as e:
    logger.error(f"Failed to initialize Gemini client: {e}")
    client = None

# System Prompt
SYSTEM_PROMPT = """You are HealthMate AI, a knowledgeable and empathetic medical assistant. You have access to authoritative medical textbooks via the provided CONTEXT.

**Your responsibilities:**
- Provide accurate, evidence-based medical information based ONLY on the provided CONTEXT.
- If the CONTEXT does not contain the answer, state that you cannot find the information in the available medical textbooks.
- Use clear, accessible language while maintaining medical accuracy.
- Be empathetic and patient-centered in your responses.
- For serious medical concerns, always recommend consulting a healthcare professional.
- If the user provides an image, analyze it carefully and describe what you see, but DO NOT provide a diagnosis. Instead, suggest what the visual findings might indicate and recommend seeing a doctor.

**Response format:**
- Start with a clear, direct answer.
- Support your answer with information from the CONTEXT.
- Use markdown formatting for better readability (headers, lists, bold text).
- End with relevant context or additional important information if needed.

**Important reminders:**
- You are an educational assistant, not a replacement for professional medical advice.
- Encourage users to consult healthcare providers for diagnosis and treatment.
"""

# Normal Chat System Prompt (No RAG)
NORMAL_SYSTEM_PROMPT = """You are HealthMate AI, a knowledgeable and empathetic medical assistant.

**Your responsibilities:**
- Provide accurate, evidence-based medical information.
- Use clear, accessible language while maintaining medical accuracy.
- Be empathetic and patient-centered in your responses.
- For serious medical concerns, always recommend consulting a healthcare professional.
- If the user provides an image, analyze it carefully and describe what you see, but DO NOT provide a diagnosis. Instead, suggest what the visual findings might indicate and recommend seeing a doctor.

**Response format:**
- Start with a clear, direct answer.
- Use markdown formatting for better readability (headers, lists, bold text).

**Important reminders:**
- You are an educational assistant, not a replacement for professional medical advice.
- Encourage users to consult healthcare providers for diagnosis and treatment.
"""

# Conversation history storage (in-memory for now)
conversation_history = {}

def chat(message: str, session_id: str = "default", image_path: str = None, use_rag: bool = True) -> dict:
    """
    Chat with HealthMate AI
    
    Args:
        message: User's message
        session_id: Session ID for conversation continuity
        image_path: Optional path to an image file
        use_rag: Whether to use RAG for context retrieval
    
    Returns:
        dict: Response with message, sources, and metadata
    """
    try:
        if not client:
            return {
                'success': False,
                'error': 'Chatbot service is not available. API key not configured.'
            }
        
        logger.info(f"Processing chat - Session: {session_id}, Image: {image_path is not None}, RAG: {use_rag}")
        
        context_chunks = []
        translation_meta = translation_service.to_english_for_rag(message)
        normalized_message = translation_meta['english_message']
        source_language = translation_meta['source_language']

        user_prompt_text = normalized_message
        system_instruction = NORMAL_SYSTEM_PROMPT

        if use_rag:
            # 1. Retrieve Context from ChromaDB
            context_chunks = rag_service.query(normalized_message)
            context_text = "\n\n".join(context_chunks) if context_chunks else "No relevant medical context found."

            # 2. Build User Prompt with Context
            user_prompt_text = f"""
CONTEXT:
{context_text}

QUESTION:
{normalized_message}
"""
            system_instruction = SYSTEM_PROMPT
        
        # 3. Prepare contents for Gemini
        contents = [user_prompt_text]
        
        if image_path:
            try:
                image = PIL.Image.open(image_path)
                contents.append(image)
            except Exception as e:
                logger.error(f"Failed to load image: {e}")
                return {
                    'success': False,
                    'error': f'Failed to process image: {str(e)}'
                }
        
        # 4. Generate response
        response = client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        
        # Extract response text
        response_text_english = response.text
        response_text = translation_service.from_english_response(response_text_english, source_language)
        
        # Store in conversation history
        if session_id not in conversation_history:
            conversation_history[session_id] = []
        
        conversation_history[session_id].append({
            'role': 'user',
            'content': message
        })
        conversation_history[session_id].append({
            'role': 'assistant',
            'content': response_text,
            'sources': [] # Sources are now implicit in the context
        })
        
        # Keep only last 40 messages per session
        if len(conversation_history[session_id]) > 40:
            conversation_history[session_id] = conversation_history[session_id][-40:]
        
        logger.info(f"Chat response generated.")
        
        return {
            'success': True,
            'response': response_text,
            'sources': [], # Could parse from text if prompted to cite, but context is unnamed chunks
            'session_id': session_id,
            'has_sources': len(context_chunks) > 0,
            'mode': 'rag' if use_rag else 'normal',
            'language': {
                'source': source_language,
                'translated_input_to_english': translation_meta['translated_for_rag'],
                'translated_output_from_english': source_language == 'ne'
            }
        }
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return {
            'success': False,
            'error': f'Failed to generate response: {str(e)}'
        }

def clear_history(session_id: str = "default"):
    """Clear conversation history for a session"""
    if session_id in conversation_history:
        del conversation_history[session_id]
        logger.info(f"Cleared history for session: {session_id}")

def get_suggested_questions() -> list:
    """Get suggested medical questions"""
    return [
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

def get_conversation_history(session_id: str = "default") -> list:
    """Get conversation history for a session"""
    return conversation_history.get(session_id, [])
