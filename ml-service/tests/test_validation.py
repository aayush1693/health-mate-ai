"""Unit tests for the upload/model validators used by the predict route."""

import pytest

from utils.validation import SUPPORTED_MODEL_TYPES, allowed_file, validate_model_type

ALLOWED = {"png", "jpg", "jpeg", "dcm"}


@pytest.mark.parametrize(
    "filename",
    ["scan.png", "scan.PNG", "chest-xray.jpg", "mri.jpeg", "slice.dcm"],
)
def test_allowed_file_accepts_supported_extensions(filename):
    assert allowed_file(filename, ALLOWED) is True


@pytest.mark.parametrize(
    "filename",
    ["notes.txt", "archive.zip", "no_extension", "", "scan.png.exe"],
)
def test_allowed_file_rejects_everything_else(filename):
    assert allowed_file(filename, ALLOWED) is False


def test_allowed_file_handles_leading_dots_in_config():
    assert allowed_file("scan.png", {".png"}) is True


def test_supported_model_types_are_the_three_detectors():
    assert SUPPORTED_MODEL_TYPES == ("pneumonia", "lung_cancer", "alzheimer")


@pytest.mark.parametrize("model_type", SUPPORTED_MODEL_TYPES)
def test_validate_model_type_accepts_known_models(model_type):
    assert validate_model_type(model_type) is True


@pytest.mark.parametrize("model_type", ["", "covid", "PNEUMONIA", None])
def test_validate_model_type_rejects_unknown_models(model_type):
    assert validate_model_type(model_type) is False
