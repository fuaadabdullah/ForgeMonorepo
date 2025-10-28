"""Property-based tests for ForgeTM backend using Hypothesis."""

import asyncio

from forge.config import Settings
from hypothesis import HealthCheck, given, settings, strategies as st


class TestSettingsValidation:
    """Test Settings class with property-based testing."""

    @given(
        host=st.text(min_size=1, max_size=253),
        port=st.integers(min_value=1, max_value=65535),
        version=st.text(min_size=1, max_size=50),
    )
    @settings(deadline=None)  # Disable deadline for this test
    def test_backend_config_validation(self, host, port, version):
        """Test that backend configuration accepts valid inputs."""
        settings = Settings(
            backend_host=host,
            backend_port=port,
            forgetm_backend_version=version,
            enable_tracing=False,  # Disable tracing for tests
        )

        assert settings.backend_host == host
        assert settings.backend_port == port
        assert settings.version == version

    @given(
        url=st.from_regex(r"https?://[a-zA-Z0-9.-]+(?::\d+)?(?:/[a-zA-Z0-9._~-]*)*")
    )
    @settings(suppress_health_check=[HealthCheck.filter_too_much], deadline=None)
    def test_url_validation(self, url):
        """Test that URL fields accept valid URLs."""
        settings = Settings(
            ollama_base_url=url,
            litellm_proxy_url=url,
            enable_tracing=False,  # Disable tracing for tests
        )

        assert settings.ollama_base_url == url
        assert settings.litellm_proxy_url == url

    @given(
        api_key=st.text(min_size=10, max_size=200).filter(
            lambda x: all(c.isalnum() or c in "-_." for c in x)
        )
    )
    @settings(deadline=None)  # Disable deadline for this test
    def test_api_key_validation(self, api_key):
        """Test that API keys accept valid key formats."""
        settings = Settings(
            gemini_api_key=api_key,
            deepseek_api_key=api_key,
            openai_api_key=api_key,
            enable_tracing=False,  # Disable tracing for tests
        )

        assert settings.gemini_api_key == api_key
        assert settings.deepseek_api_key == api_key
        assert settings.openai_api_key == api_key

    @given(
        db_url=st.from_regex(r"postgresql://[^@]+@[^@]+:\d+/[^/?]+")
    )
    @settings(suppress_health_check=[HealthCheck.filter_too_much], deadline=None)
    def test_database_url_validation(self, db_url):
        """Test that database URLs accept valid PostgreSQL URLs."""
        settings = Settings(database_url=db_url, enable_tracing=False)
        assert settings.database_url == db_url

    @given(
        redis_url=st.from_regex(r"redis://(?:[^@]+@)?[^@]+:\d+(?:/\d+)?")
    )
    @settings(suppress_health_check=[HealthCheck.filter_too_much], deadline=None)
    def test_redis_url_validation(self, redis_url):
        """Test that Redis URLs accept valid Redis URLs."""
        settings = Settings(redis_url=redis_url, enable_tracing=False)
        assert settings.redis_url == redis_url


class TestHealthEndpoint:
    """Property-based tests for health endpoint."""

    @given(uptime=st.floats(min_value=0, max_value=86400))  # 24 hours max
    @settings(deadline=None)  # Disable deadline for this test
    def test_uptime_calculation(self, uptime):
        """Test that uptime calculation works for various time values."""
        import time
        from forge import config

        # Mock the app_started_at to control uptime calculation
        original_started_at = config.settings.app_started_at
        config.settings.app_started_at = 1000000000.0

        # Mock time.time to return a time after app_started_at
        original_time = time.time
        time.time = lambda: 1000000000.0 + uptime

        try:
            from forge.main import health
            # Since health is async, we need to run it in an event loop
            result = asyncio.run(health())
            assert result["status"] == "ok"
            assert "version" in result
            assert isinstance(result["uptime_sec"], (int, float))
            assert result["uptime_sec"] >= 0
            assert abs(result["uptime_sec"] - uptime) < 0.001  # Should be very close
        finally:
            time.time = original_time
            config.settings.app_started_at = original_started_at
