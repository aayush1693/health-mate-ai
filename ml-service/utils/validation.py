"""Small, dependency-free request validators used by the Flask routes.

Kept separate from ``app.py`` so they can be unit tested without importing
TensorFlow or any of the model-bearing service modules.
"""

from typing import Iterable

# Model keys accepted by /api/predict
SUPPORTED_MODEL_TYPES = ("pneumonia", "lung_cancer", "alzheimer")


def allowed_file(filename: str, allowed_extensions: Iterable[str]) -> bool:
    """Return True when ``filename`` has one of the allowed extensions.

    Comparison is case-insensitive and tolerant of a leading dot in the
    configured extensions (``".PNG"`` and ``"png"`` both work).
    """
    if not filename or "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()
    normalized = {ext.lower().lstrip(".") for ext in allowed_extensions}
    return extension in normalized


def validate_model_type(
    model_type: str, supported: Iterable[str] = SUPPORTED_MODEL_TYPES
) -> bool:
    """Return True when ``model_type`` names a supported detection model."""
    return model_type in set(supported)
