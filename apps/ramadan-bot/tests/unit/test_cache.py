"""Unit tests for ramadan_bot.cache module."""

import os
import pytest
from unittest.mock import patch


@pytest.mark.unit
class TestCachePathForJuz:
    """Test cache path generation."""

    def test_basic_path(self):
        """Test basic cache path without date tag."""
        from ramadan_bot.cache import cache_path_for_juz
        from ramadan_bot import config

        result = cache_path_for_juz(1)
        assert result == os.path.join(config.CACHE_DIR, "juz_1.png")

    def test_path_with_date_tag(self):
        """Test cache path with date tag."""
        from ramadan_bot.cache import cache_path_for_juz
        from ramadan_bot import config

        result = cache_path_for_juz(5, date_tag="2026-02-21")
        assert result == os.path.join(config.CACHE_DIR, "juz_5_2026-02-21.png")

    def test_all_juz_values(self):
        """Test that all 30 Juz produce unique paths."""
        from ramadan_bot.cache import cache_path_for_juz

        paths = [cache_path_for_juz(j) for j in range(1, 31)]
        assert len(set(paths)) == 30


@pytest.mark.unit
class TestGenerateAndCache:
    """Test generate_and_cache function."""

    @patch("ramadan_bot.cache.overlay_quran_text_bytes")
    @patch("ramadan_bot.cache.siliconflow_generate_bytes")
    def test_generate_new_image(self, mock_gen, mock_overlay, tmp_path, monkeypatch):
        """Test generating a new image when no cache exists."""
        from ramadan_bot import config
        from ramadan_bot.cache import generate_and_cache

        monkeypatch.setattr(config, "CACHE_DIR", str(tmp_path))
        monkeypatch.setattr(config, "SILICONFLOW_API_KEY", "test-key")

        mock_gen.return_value = b"\x89PNG_raw"
        mock_overlay.return_value = b"\x89PNG_overlay"

        image_bytes, path = generate_and_cache(1, api_key="test-key")

        assert image_bytes == b"\x89PNG_overlay"
        assert os.path.exists(path)
        assert path.endswith("juz_1.png")
        mock_gen.assert_called_once()
        mock_overlay.assert_called_once()

    @patch("ramadan_bot.cache.overlay_quran_text_bytes")
    @patch("ramadan_bot.cache.siliconflow_generate_bytes")
    def test_use_cached_image(self, mock_gen, mock_overlay, tmp_path, monkeypatch):
        """Test that cached images are returned without regeneration."""
        from ramadan_bot import config
        from ramadan_bot.cache import generate_and_cache

        monkeypatch.setattr(config, "CACHE_DIR", str(tmp_path))

        # Pre-create a cached image
        cached_path = tmp_path / "juz_1.png"
        cached_path.write_bytes(b"\x89PNG_cached")

        image_bytes, path = generate_and_cache(1)

        assert image_bytes == b"\x89PNG_cached"
        mock_gen.assert_not_called()
        mock_overlay.assert_not_called()

    @patch("ramadan_bot.cache.overlay_quran_text_bytes")
    @patch("ramadan_bot.cache.siliconflow_generate_bytes")
    def test_force_regenerate(self, mock_gen, mock_overlay, tmp_path, monkeypatch):
        """Test that force=True regenerates even with cache."""
        from ramadan_bot import config
        from ramadan_bot.cache import generate_and_cache

        monkeypatch.setattr(config, "CACHE_DIR", str(tmp_path))
        monkeypatch.setattr(config, "SILICONFLOW_API_KEY", "test-key")

        # Pre-create a cached image
        cached_path = tmp_path / "juz_1.png"
        cached_path.write_bytes(b"\x89PNG_old")

        mock_gen.return_value = b"\x89PNG_new_raw"
        mock_overlay.return_value = b"\x89PNG_new_overlay"

        image_bytes, path = generate_and_cache(1, force=True, api_key="test-key")

        assert image_bytes == b"\x89PNG_new_overlay"
        mock_gen.assert_called_once()

    def test_returns_tuple(self, tmp_path, monkeypatch):
        """Test that return value is always a 2-tuple."""
        from ramadan_bot import config
        from ramadan_bot.cache import generate_and_cache

        monkeypatch.setattr(config, "CACHE_DIR", str(tmp_path))

        # Pre-create a cached image
        cached_path = tmp_path / "juz_1.png"
        cached_path.write_bytes(b"\x89PNG_test")

        result = generate_and_cache(1)
        assert isinstance(result, tuple)
        assert len(result) == 2
        image_bytes, path = result
        assert isinstance(image_bytes, bytes)
        assert isinstance(path, str)
