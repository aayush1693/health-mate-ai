import os
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from google import genai
from config import config
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiEmbeddingFunction(EmbeddingFunction):
    def __init__(self, client):
        self.client = client

    def __call__(self, input: Documents) -> Embeddings:
        try:
            # model="models/text-embedding-004" is used in the notebook
            response = self.client.models.embed_content(
                model="text-embedding-004",
                contents=input,
                config=None
            )
            # Adapt response to list of embeddings
            # response.embeddings is likely a list of ContentEmbedding objects
            return [e.values for e in response.embeddings]
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return []

class RagService:
    def __init__(self):
        self.client = None
        self.db_client = None
        self.collection = None
        self._initialize()

    def _initialize(self):
        try:
            # Initialize Gemini Client
            self.client = genai.Client(api_key=config.GEMINI_API_KEY)
            
            # Initialize ChromaDB
            # Path must be absolute or relative to where the app runs
            # Assuming app runs from ml-service directory or root
            # We use an absolute path logic relative to this file
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "chroma_db", "content", "chroma_db_storage")
            
            logger.info(f"Connecting to ChromaDB at {db_path}")
            self.db_client = chromadb.PersistentClient(path=db_path)
            
            # Get Collection
            # Try finding 'medical_rag' or fallback to first one
            collections = self.db_client.list_collections()
            collection_names = [c.name for c in collections]
            
            target_collection = "medical_rag"
            if target_collection not in collection_names and collection_names:
                target_collection = collection_names[0]
            
            if target_collection in collection_names:
                self.collection = self.db_client.get_collection(
                    name=target_collection,
                    embedding_function=GeminiEmbeddingFunction(self.client)
                )
                logger.info(f"RAG Service initialized with collection: {target_collection}")
            else:
                logger.warning("No collections found in ChromaDB.")

        except Exception as e:
            logger.error(f"Failed to initialize RagService: {e}")

    def query(self, text: str, n_results: int = 3) -> list:
        if not self.collection:
            logger.warning("RAG collection not initialized. Skipping query.")
            return []
        
        try:
            logger.info(f"Querying ChromaDB for: '{text[:50]}...'")
            results = self.collection.query(
                query_texts=[text],
                n_results=n_results
            )
            # results['documents'] is a list of lists (one per query)
            if results and results['documents']:
                num_results = len(results['documents'][0])
                logger.info(f"Found {num_results} context chunks from RAG.")
                return results['documents'][0]
            
            logger.info("No context found in RAG.")
            return []
        except Exception as e:
            logger.error(f"RAG Query error: {e}")
            return []

# Singleton instance
rag_service = RagService()
