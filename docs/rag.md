# HealthMate AI RAG System Documentation

This document explains the Retrieval-Augmented Generation (RAG) pipeline used in the project, including multilingual handling (English/Nepali), retrieval logic, ranking, and response generation.

## 1) High-level architecture

The chatbot path (`/api/chat`) uses:

1. **Language handling** (`translation_service`)
2. **Context retrieval** from ChromaDB (`rag_service`)
3. **Prompt construction** with retrieved chunks (`chatbot.py`)
4. **LLM answer generation** (Gemini)
5. **Optional translation back to user language**

Core files:

- `ml-service/services/chatbot.py`
- `ml-service/services/rag_service.py`
- `ml-service/services/translation_service.py`
- `ml-service/config.py`

---

## 2) Request flow in `/api/chat`

`ml-service/app.py` endpoint behavior:

- Accepts JSON or multipart form-data
- Supports text-only or text+image chat
- Optional `use_rag` flag (default true)
- Passes request to `services.chatbot.chat(...)`

If image is supplied, image is temporarily saved in `uploads/`, loaded into PIL, sent with text prompt, then deleted.

---

## 3) Translation and language normalization

The translation layer runs before retrieval so RAG can query in English consistently.

### Language detection

`TranslationService.detect_language(text)`:

- If Devanagari Unicode chars are found, immediately returns `ne` (Nepali)
- Else, asks Gemini to return strict JSON language code (`en` or `ne`)
- Fallback default is English if detection fails

### Input translation to English for RAG

`to_english_for_rag(user_message)`:

- Detect source language
- If Nepali, translate using Google Translate public endpoint:
  - `https://translate.googleapis.com/translate_a/single?...`
- Returns metadata:
  - `source_language`
  - `english_message`
  - `translated_for_rag` (bool)

### Output translation back to user language

`from_english_response(english_response, target_language)`:

- If source was Nepali, translates final English answer back to Nepali
- Else returns original English text

---

## 4) RAG ingestion/retrieval store

The service connects to Chroma persistent DB path:

`ml-service/chroma_db/content/chroma_db_storage`

`RagService._initialize()`:

- Builds Gemini client and embedding function
- Opens Chroma `PersistentClient`
- Prefers collection `medical_rag`; if absent, uses first available collection
- Infers collection embedding dimension from sample embedding and configures embedding output dimensionality to match

---

## 5) Embedding strategy and robustness

`GeminiEmbeddingFunction` attempts multiple embedding models in fallback order:

1. `config.GEMINI_EMBEDDING_MODEL` (if configured)
2. `gemini-embedding-001`
3. `text-embedding-004`
4. `models/gemini-embedding-001`
5. `models/text-embedding-004`

If a model fails, it automatically tries next candidate. If embedding dimension mismatch occurs, vectors are truncated/padded to configured target dimensionality.

---

## 6) Hybrid retrieval and reranking

`RagService.query(text, n_results=3)` combines semantic and lexical relevance:

1. Build query terms with token normalization (`_build_query_terms`)
2. Retrieve semantic candidates (top `max(n_results*3, 10)`) using embedding query (or text query fallback)
3. Re-rank each candidate using:
   - lexical term-count score
   - semantic rank position score
   - combined score:

`combined = (2.0 * lexical_score) + semantic_rank_score`

4. Select top `n_results`
5. Validate lexical overlap with informative terms
6. If overlap weak or retrieval empty, run keyword fallback

### Keyword fallback

`_keyword_fallback_query` scans available documents and returns chunks with highest lexical score.

---

## 7) Dimensionality mismatch recovery

If Chroma query fails with embedding dimension error:

- Parse expected dimension from exception text
- Set embedding output dimensionality to expected value
- Retry embedding+query
- Re-run hybrid scoring on retry result

If retry also fails, fallback keyword retrieval is used.

---

## 8) Prompt assembly and generation

When `use_rag=true`:

- Chatbot constructs prompt:

```
CONTEXT:
<chunk_1>
<chunk_2>
...

QUESTION:
<english_user_question>
```

- Uses RAG-specific system prompt that instructs model to answer based on context only and explicitly say when context is insufficient.

When `use_rag=false`:

- Uses normal medical assistant system prompt (no context retrieval).

Gemini model comes from `config.GEMINI_MODEL`.

---

## 9) Image + RAG behavior

If an image is provided:

- PIL image object is appended to model `contents`
- System prompt explicitly tells assistant to avoid definitive diagnosis from image alone
- Assistant should describe observations and recommend professional evaluation

---

## 10) Session and response metadata

`chatbot.py` stores in-memory conversation history by `session_id` (keeps last 40 messages).

API response includes:

- `success`
- `response`
- `session_id`
- `has_sources` (true when context chunks were found)
- `mode` (`rag` or `normal`)
- `language` object:
  - `source`
  - `translated_input_to_english`
  - `translated_output_from_english`

---

## 11) Safety and behavior constraints in prompts

System instructions enforce:

- Educational-only guidance
- Encourage consultation with healthcare professionals
- Do not hallucinate textbook content outside provided context
- Respond empathetically with clear structure

---

## 12) Operational dependencies

Required config/env values:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_EMBEDDING_MODEL` (optional but recommended)
- ChromaDB storage populated with medical documents/chunks

If RAG store or embedding fails, service degrades gracefully with lexical fallback or normal chat behavior.
