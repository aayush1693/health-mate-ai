import os
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from google import genai
from google.genai import types
from config import config
import logging
import re
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GENERIC_QUERY_TERMS = {
    "what", "is", "are", "the", "a", "an", "about", "explain", "define", "meaning",
    "of", "in", "on", "for", "to", "and", "disease", "condition", "medical", "tell"
}

class GeminiEmbeddingFunction(EmbeddingFunction):
    def __init__(self, client):
        self.client = client
        configured_model = getattr(config, 'GEMINI_EMBEDDING_MODEL', '').strip()
        fallback_models = [
            configured_model,
            "gemini-embedding-001",
            "text-embedding-004",
            "models/gemini-embedding-001",
            "models/text-embedding-004"
        ]
        self.candidate_models = [m for m in fallback_models if m]
        self.active_model = self.candidate_models[0] if self.candidate_models else "gemini-embedding-001"
        self.output_dimensionality = None

    def set_output_dimensionality(self, dim: int):
        if isinstance(dim, int) and dim > 0:
            self.output_dimensionality = dim
            logger.info(f"Embedding output dimensionality set to {dim}")

    def _fit_dimensions(self, embeddings: Embeddings) -> Embeddings:
        if not self.output_dimensionality:
            return embeddings

        target_dim = self.output_dimensionality
        adjusted = []
        for vector in embeddings:
            if len(vector) == target_dim:
                adjusted.append(vector)
            elif len(vector) > target_dim:
                adjusted.append(vector[:target_dim])
            else:
                adjusted.append(vector + ([0.0] * (target_dim - len(vector))))
        return adjusted

    def __call__(self, input: Documents) -> Embeddings:
        last_error = None

        for model_name in [self.active_model] + [m for m in self.candidate_models if m != self.active_model]:
            try:
                embed_config = None
                if self.output_dimensionality:
                    embed_config = types.EmbedContentConfig(output_dimensionality=self.output_dimensionality)

                try:
                    response = self.client.models.embed_content(
                        model=model_name,
                        contents=input,
                        config=embed_config
                    )
                except Exception:
                    response = self.client.models.embed_content(
                        model=model_name,
                        contents=input,
                        config=None
                    )
                embeddings = [e.values for e in response.embeddings]
                if embeddings:
                    embeddings = self._fit_dimensions(embeddings)
                    if model_name != self.active_model:
                        logger.info(f"Embedding model switched from {self.active_model} to {model_name}")
                        self.active_model = model_name
                    return embeddings
            except Exception as e:
                last_error = e
                logger.warning(f"Embedding failed with model '{model_name}': {e}")

        logger.error(f"Embedding error after trying all models: {last_error}")
        return []

class RagService:
    def __init__(self):
        self.client = None
        self.db_client = None
        self.collection = None
        self.embedding_function = None
        self._initialize()

    def _initialize(self):
        try:
            # Initialize Gemini Client
            self.client = genai.Client(api_key=config.GEMINI_API_KEY)
            self.embedding_function = GeminiEmbeddingFunction(self.client)
            
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
                    embedding_function=self.embedding_function
                )

                try:
                    sample = self.collection.get(limit=1, include=["embeddings"])
                    sample_embeddings = sample.get("embeddings", []) if sample else []
                    if sample_embeddings and len(sample_embeddings[0]) > 0:
                        inferred_dim = len(sample_embeddings[0])
                        self.embedding_function.set_output_dimensionality(inferred_dim)
                        logger.info(f"Detected collection embedding dimension: {inferred_dim}")
                except Exception as dim_error:
                    logger.warning(f"Could not infer collection embedding dimension: {dim_error}")

                logger.info(f"RAG Service initialized with collection: {target_collection}")
            else:
                logger.warning("No collections found in ChromaDB.")

        except Exception as e:
            logger.error(f"Failed to initialize RagService: {e}")

    def _tokenize(self, text: str) -> List[str]:
        return [t for t in re.findall(r"[a-zA-Z0-9]+", text.lower()) if len(t) > 2]

    def _build_query_terms(self, text: str) -> List[str]:
        base_terms = self._tokenize(text)
        expanded = set(base_terms)

        for term in base_terms:
            if term.endswith("s") and len(term) > 4:
                expanded.add(term[:-1])
                expanded.add(f"{term[:-1]}'s")
            if "'" in term:
                expanded.add(term.replace("'", ""))

        return sorted(expanded)

    def _lexical_score(self, doc: str, query_terms: List[str]) -> int:
        lower_doc = doc.lower()
        return sum(lower_doc.count(term) for term in query_terms)

    def _has_relevant_overlap(self, doc: str, query_terms: List[str]) -> bool:
        lower_doc = doc.lower()
        informative_terms = [t for t in query_terms if t not in GENERIC_QUERY_TERMS]
        if not informative_terms:
            informative_terms = query_terms
        return any(term in lower_doc for term in informative_terms)

    def _keyword_fallback_query(self, text: str, n_results: int = 3) -> list:
        if not self.collection:
            return []

        try:
            docs_result = self.collection.get(include=["documents"])
            documents = docs_result.get("documents", []) if docs_result else []
            if not documents:
                return []

            query_terms = self._build_query_terms(text)
            if not query_terms:
                return []

            scored_docs = []
            for doc in documents:
                lower_doc = doc.lower()
                score = self._lexical_score(lower_doc, query_terms)
                if score > 0:
                    scored_docs.append((score, doc))

            scored_docs.sort(key=lambda item: item[0], reverse=True)
            fallback_docs = [doc for _, doc in scored_docs[:n_results]]
            logger.info(f"Keyword fallback returned {len(fallback_docs)} context chunks.")
            return fallback_docs
        except Exception as e:
            logger.error(f"Keyword fallback query error: {e}")
            return []

    def query(self, text: str, n_results: int = 3) -> list:
        if not self.collection:
            logger.warning("RAG collection not initialized. Skipping query.")
            return []
        
        try:
            logger.info(f"Querying ChromaDB for: '{text[:50]}...'")
            query_terms = self._build_query_terms(text)
            semantic_fetch_size = max(n_results * 3, 10)
            query_embeddings = None
            if self.embedding_function:
                query_embeddings = self.embedding_function([text])

            if query_embeddings:
                results = self.collection.query(query_embeddings=query_embeddings, n_results=semantic_fetch_size)
            else:
                results = self.collection.query(query_texts=[text], n_results=semantic_fetch_size)
            # results['documents'] is a list of lists (one per query)
            if results and results['documents']:
                docs = results['documents'][0]
                scored_docs = []
                for idx, doc in enumerate(docs):
                    lexical = self._lexical_score(doc, query_terms)
                    semantic_rank_score = max(0.0, 1.0 - (idx / max(len(docs), 1)))
                    combined = (lexical * 2.0) + semantic_rank_score
                    scored_docs.append((combined, lexical, doc))

                scored_docs.sort(key=lambda item: (item[0], item[1]), reverse=True)
                top_docs = [doc for _, _, doc in scored_docs[:n_results]]

                if top_docs and any(self._has_relevant_overlap(doc, query_terms) for doc in top_docs):
                    logger.info(f"Found {len(top_docs)} context chunks from hybrid RAG ranking.")
                    return top_docs

                logger.info("Semantic retrieval had weak lexical overlap; using keyword fallback.")
                return self._keyword_fallback_query(text, n_results=n_results)
            
            logger.info("No context found in RAG.")
            return self._keyword_fallback_query(text, n_results=n_results)
        except Exception as e:
            error_text = str(e)

            dimension_match = re.search(r"dimension of\s+(\d+),\s+got\s+(\d+)", error_text)
            if dimension_match and self.embedding_function:
                expected_dim = int(dimension_match.group(1))
                self.embedding_function.set_output_dimensionality(expected_dim)
                try:
                    logger.info(f"Retrying RAG query with output_dimensionality={expected_dim}")
                    retry_embeddings = self.embedding_function([text])
                    retry_results = self.collection.query(
                        query_embeddings=retry_embeddings,
                        n_results=max(n_results * 3, 10)
                    )
                    if retry_results and retry_results['documents']:
                        query_terms = self._build_query_terms(text)
                        retry_docs = retry_results['documents'][0]
                        scored_retry_docs = []
                        for idx, doc in enumerate(retry_docs):
                            lexical = self._lexical_score(doc, query_terms)
                            semantic_rank_score = max(0.0, 1.0 - (idx / max(len(retry_docs), 1)))
                            combined = (lexical * 2.0) + semantic_rank_score
                            scored_retry_docs.append((combined, lexical, doc))

                        scored_retry_docs.sort(key=lambda item: (item[0], item[1]), reverse=True)
                        top_retry_docs = [doc for _, _, doc in scored_retry_docs[:n_results]]

                        if top_retry_docs and any(self._has_relevant_overlap(doc, query_terms) for doc in top_retry_docs):
                            logger.info(f"Found {len(top_retry_docs)} context chunks after dimensionality retry.")
                            return top_retry_docs
                except Exception as retry_error:
                    logger.error(f"RAG retry after dimensionality fix failed: {retry_error}")

            logger.error(f"RAG Query error: {e}")
            return self._keyword_fallback_query(text, n_results=n_results)

# Singleton instance
rag_service = RagService()
