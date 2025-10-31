import time

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables and .env files.

    See ForgeMonorepo/Obsidian/API_KEYS_MANAGEMENT.md for environment
    configuration guidelines.
    """

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # App metadata
    app_started_at: float = time.time()
    forgetm_backend_version: str = '0.1.0'

    # LiteLLM proxy configuration
    litellm_master_key: str | None = None  # For proxy authentication
    litellm_database_url: str | None = None  # For proxy database
    litellm_config_path: str | None = None  # Path to litellm config file

    # API Keys (loaded from environment)
    gemini_api_key: str | None = None
    deepseek_api_key: str | None = None
    openai_api_key: str | None = None
    polygon_api_key: str | None = None

    # Ollama configuration
    ollama_base_url: str | None = None

    # LiteLLM proxy URL
    litellm_proxy_url: str | None = None

    # Backend configuration
    backend_host: str = '127.0.0.1'
    backend_port: int = 8000
    database_url: str = 'sqlite:///./forgetm.db'
    redis_url: str = 'redis://localhost:6379/0'
    secret_key: str = 'your-secret-key-here-change-in-production'  # JWT secret key

    # Overmind bridge configuration
    overmind_bridge_port: int = 3030

    # Observability
    otel_service_name: str = 'forgetm-backend'
    otel_service_version: str = '0.1.0'
    otel_exporter_otlp_endpoint: str = 'http://localhost:4318/v1/traces'
    enable_tracing: bool = True

    # Testing configuration
    testing: bool = False  # Set to True to bypass authentication for testing
    sentry_dsn: str | None = None
    sentry_environment: str = 'development'
    sentry_release: str = 'forgetm-backend@0.1.0'
    sentry_traces_sample_rate: float = 1.0
    sentry_profiles_sample_rate: float = 1.0
    enable_sentry: bool = True

    @property
    def version(self) -> str:
        """Get the version from environment variable."""
        return self.forgetm_backend_version


settings = Settings()
