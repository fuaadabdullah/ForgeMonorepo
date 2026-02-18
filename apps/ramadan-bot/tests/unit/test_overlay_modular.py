"""Unit tests for ramadan_bot.generation.overlay module (modular version)."""

import io
import pytest
from PIL import Image


def _make_test_png(width=512, height=512, color=(10, 10, 10)):
    """Create a test PNG image in memory."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.unit
class TestOverlayQuranTextBytes:
    """Test text overlay on images."""

    def test_returns_png(self):
        """Test that overlay returns valid PNG bytes."""
        from ramadan_bot.generation.overlay import overlay_quran_text_bytes

        base = _make_test_png()
        result = overlay_quran_text_bytes(base, "بِسْمِ اللَّهِ", "In the name of God")

        assert isinstance(result, bytes)
        assert result.startswith(b"\x89PNG")

    def test_preserves_dimensions(self):
        """Test that overlay preserves original image dimensions."""
        from ramadan_bot.generation.overlay import overlay_quran_text_bytes

        base = _make_test_png(1024, 1024)
        result = overlay_quran_text_bytes(base, "تَبَارَكَ", "Blessed")

        img = Image.open(io.BytesIO(result))
        assert img.size == (1024, 1024)

    def test_empty_text(self):
        """Test overlay with empty text strings."""
        from ramadan_bot.generation.overlay import overlay_quran_text_bytes

        base = _make_test_png()
        result = overlay_quran_text_bytes(base, "", "")

        assert isinstance(result, bytes)
        assert result.startswith(b"\x89PNG")

    def test_arabic_reshaping(self):
        """Test that Arabic text is processed without errors."""
        from ramadan_bot.generation.overlay import overlay_quran_text_bytes

        base = _make_test_png()
        # Verse from Al-Fatiha with diacritics
        arabic = "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"
        english = "All praise is due to God, Lord of all the worlds"

        result = overlay_quran_text_bytes(base, arabic, english)
        assert len(result) > 0
