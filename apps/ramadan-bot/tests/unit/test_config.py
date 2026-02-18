"""Unit tests for ramadan_bot.config module."""

import os
import pytest


@pytest.mark.unit
class TestGetSecret:
    """Test _get_secret helper."""

    def test_get_secret_from_env(self, monkeypatch):
        """Test reading a secret from environment."""
        monkeypatch.setenv("TEST_SECRET_KEY", "secret_value_123")
        from ramadan_bot.config import _get_secret

        result = _get_secret("TEST_SECRET_KEY")
        assert result == "secret_value_123"

    def test_get_secret_default(self):
        """Test default value when secret is missing."""
        from ramadan_bot.config import _get_secret

        result = _get_secret("NONEXISTENT_KEY_12345", "fallback")
        assert result == "fallback"

    def test_get_secret_none_default(self):
        """Test None default when no secret and no default."""
        from ramadan_bot.config import _get_secret

        result = _get_secret("NONEXISTENT_KEY_12345")
        assert result is None


@pytest.mark.unit
class TestConfigValues:
    """Test that config values are loaded correctly."""

    def test_ramadan_dates(self):
        """Test Ramadan 2026 date bounds."""
        from ramadan_bot import config

        assert config.RAMADAN_START.year == 2026
        assert config.RAMADAN_START.month == 2
        assert config.RAMADAN_START.day == 17
        assert config.RAMADAN_END.year == 2026
        assert config.RAMADAN_END.month == 3
        assert config.RAMADAN_END.day == 18

    def test_font_paths_exist(self):
        """Test that configured font paths point to existing files."""
        from ramadan_bot import config

        # Font files should exist (committed to repo)
        assert os.path.exists(config.FONT_AR), (
            f"Arabic font not found: {config.FONT_AR}"
        )
        assert os.path.exists(config.FONT_EN), (
            f"English font not found: {config.FONT_EN}"
        )

    def test_directories_created(self):
        """Test that cache and log directories exist."""
        from ramadan_bot import config

        assert os.path.isdir(config.CACHE_DIR)
        assert os.path.isdir(config.LOG_DIR)

    def test_sms_recipients_is_list(self):
        """Test SMS_RECIPIENTS is always a list."""
        from ramadan_bot import config

        assert isinstance(config.SMS_RECIPIENTS, list)

    def test_lat_lon_are_floats(self):
        """Test coordinates are numeric."""
        from ramadan_bot import config

        assert isinstance(config.LAT, float)
        assert isinstance(config.LON, float)
