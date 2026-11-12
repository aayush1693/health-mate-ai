import json
import logging
from urllib.parse import quote_plus

import requests
from google import genai
from google.genai import types

from config import config

logger = logging.getLogger(__name__)


class TranslationService:
    def __init__(self):
        self.client = None
        self.enabled = bool(config.GEMINI_API_KEY)
        if self.enabled:
            try:
                self.client = genai.Client(api_key=config.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client for translation: {e}")
                self.enabled = False

    def _contains_devanagari(self, text: str) -> bool:
        return any("\u0900" <= char <= "\u097F" for char in text)

    def detect_language(self, text: str) -> str:
        stripped = (text or "").strip()
        if not stripped:
            return "en"

        if self._contains_devanagari(stripped):
            return "ne"

        if not self.enabled or not self.client:
            return "en"

        prompt = (
            "Detect the language of this text. "
            "Return strict JSON only in this format: {\"language\":\"en\"} or {\"language\":\"ne\"}. "
            "If uncertain, return en.\n\n"
            f"Text: {stripped}"
        )

        try:
            response = self.client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0,
                    response_mime_type="application/json"
                )
            )
            parsed = json.loads(response.text)
            language = parsed.get("language", "en").lower()
            if language not in ["en", "ne"]:
                return "en"
            return language
        except Exception as e:
            logger.warning(f"Language detection failed, defaulting to English: {e}")
            return "en"

    def _translate_with_google(self, text: str, source_lang: str, target_lang: str) -> str:
        if not text.strip() or source_lang == target_lang:
            return text

        encoded = quote_plus(text)
        url = (
            "https://translate.googleapis.com/translate_a/single"
            f"?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={encoded}"
        )
        headers = {
            "User-Agent": config.TRANSLATE_USER_AGENT
        }

        response = requests.get(url, headers=headers, timeout=config.TRANSLATE_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
        translated_parts = [chunk[0] for chunk in payload[0] if chunk and len(chunk) > 0]
        return "".join(translated_parts).strip() or text

    def to_english_for_rag(self, user_message: str) -> dict:
        source_language = self.detect_language(user_message)
        translated = user_message
        translated_for_rag = False

        if source_language == "ne":
            try:
                translated = self._translate_with_google(user_message, "ne", "en")
                translated_for_rag = translated.strip().lower() != user_message.strip().lower()
            except Exception as e:
                logger.error(f"Nepali to English translation failed: {e}")
                translated = user_message

        return {
            "source_language": source_language,
            "english_message": translated,
            "translated_for_rag": translated_for_rag
        }

    def from_english_response(self, english_response: str, target_language: str) -> str:
        if target_language != "ne":
            return english_response

        try:
            return self._translate_with_google(english_response, "en", "ne")
        except Exception as e:
            logger.error(f"English to Nepali translation failed: {e}")
            return english_response


translation_service = TranslationService()
