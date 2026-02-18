import pytest
from datetime import date


@pytest.fixture()
def sample_date():
    """Return a date within Ramadan 2026 for modular package tests."""
    return date(2026, 2, 20)  # Day 4 of Ramadan 1447 AH


@pytest.fixture()
def temp_image(tmp_path):
    path = tmp_path / "image.png"
    path.write_bytes(b"\x89PNG\r\n\x1a\n")
    return path
