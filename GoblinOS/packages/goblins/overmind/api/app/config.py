"""
Application configuration using pydantic-settings
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # Environment
    environment: str = "development"

    # API Server
    api_host: str = "0.0.0.0"
    api_port: int = 8001

    # Security
    api_key: str = "dev-api-key-change-in-production"
    jwt_secret: str = "dev-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS - Use env var CORS_ORIGINS (comma-separated) or defaults
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Rate Limiting
    rate_limit_per_minute: int = 100
    global_rate_limit_per_minute: int = 1000

    # Logging
    log_level: str = "INFO"

    # Node.js Bridge - Use NODE_BRIDGE_URL env var (set to http://bridge:3030 in Docker/k8s)
    node_bridge_url: str = "http://localhost:3030"
    node_bridge_timeout: int = 60

    # LLM Provider API Keys
    openai_api_key: str = ""
    deepseek_api_key: str = ""
    gemini_api_key: str = ""

    # Ollama Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_default_model: str = "llama3.1"

    # LiteLLM Proxy (optional but recommended)
    litellm_url: str = "http://localhost:4000"
    litellm_api_key: str = "proxy"

    # Routing Preferences
    routing_strategy: str = "cost-optimized"  # predictive|cascading|cost-optimized|latency-optimized|local-first
    prefer_local: bool = False
    offline_mode: bool = False
    enable_fallback: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
