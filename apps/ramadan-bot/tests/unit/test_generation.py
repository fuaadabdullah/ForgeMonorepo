"""Unit tests for image generation."""

import pytest
import io
from PIL import Image
from unittest.mock import patch, Mock
from ramadan_bot.generation.siliconflow import (
    siliconflow_generate_bytes,
    _test_placeholder_image_bytes,
)


@pytest.mark.unit
class TestPlaceholderImage:
    """Test placeholder image generation for TEST_MODE."""

    def test_placeholder_image_bytes(self):
        """Test that placeholder image is valid PNG."""
        result = _test_placeholder_image_bytes()
        assert isinstance(result, bytes)
        assert result.startswith(b"\x89PNG")  # PNG magic bytes

    def test_placeholder_image_size(self):
        """Test placeholder image dimensions."""
        result = _test_placeholder_image_bytes((512, 512))
        img = Image.open(io.BytesIO(result))
        assert img.size == (512, 512)


@pytest.mark.unit
class TestSiliconflowGenerate:
    """Test SiliconFlow image generation."""

    @patch("ramadan_bot.generation.siliconflow.requests.post")
    @patch("ramadan_bot.generation.siliconflow.requests.get")
    def test_generate_success(self, mock_get, mock_post):
        """Test successful image generation."""
        # Mock API response
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {"images": [{"url": "https://example.com/image.png"}]},
        )
        # Mock image download
        mock_get.return_value = Mock(
            status_code=200,
            content=b"\x89PNG\r\n\x1a\n" + b"\x00" * 100,
        )

        result = siliconflow_generate_bytes(
            api_key="test-key",
            model="test-model",
            prompt="test prompt",
        )

        assert isinstance(result, bytes)
        assert result.startswith(b"\x89PNG")

    def test_generate_test_mode(self, monkeypatch):
        """Test that TEST_MODE returns placeholder."""
        monkeypatch.setattr("ramadan_bot.generation.siliconflow.TEST_MODE", True)

        result = siliconflow_generate_bytes(
            api_key="test-key",
            model="test-model",
            prompt="test prompt",
        )

        assert isinstance(result, bytes)
        assert result.startswith(b"\x89PNG")

    def test_generate_no_api_key(self):
        """Test that missing API key raises error."""
        with pytest.raises(RuntimeError, match="SILICONFLOW_API_KEY"):
            siliconflow_generate_bytes(
                api_key=None,
                model="test-model",
                prompt="test prompt",
            )
