"""Sanity checks on the model registry in config.py."""

import pytest

pytest.importorskip("dotenv", reason="python-dotenv needed to import config")

from config import config  # noqa: E402


def test_every_supported_model_has_labels_and_input_size():
    for model_type in ("pneumonia", "lung_cancer", "alzheimer"):
        assert model_type in config.CLASS_LABELS
        assert model_type in config.MODEL_INPUT_SIZES
        assert len(config.CLASS_LABELS[model_type]) >= 2


def test_alzheimer_keeps_four_stage_labels():
    assert config.CLASS_LABELS["alzheimer"] == [
        "Mild Demented",
        "Moderate Demented",
        "Non Demented",
        "Very Mild Demented",
    ]


def test_upload_limits_are_reasonable():
    assert "png" in config.ALLOWED_EXTENSIONS
    assert 0 < config.MAX_CONTENT_LENGTH <= 64 * 1024 * 1024
