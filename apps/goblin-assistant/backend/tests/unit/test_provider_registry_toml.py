from __future__ import annotations

from pathlib import Path

from backend.providers.base import InferenceRequest
from backend.providers.registry import ProviderRegistry
from backend.services.routing_subsystem.decision_engine import DecisionEngine


def _write_minimal_providers_toml(path: Path) -> None:
    path.write_text(
        """
[providers.ollama_gcp]
name = "Ollama (GCP)"
endpoint = "http://127.0.0.1:11434"
capabilities = ["chat"]
models = ["gemma:2b", "mistral:7b"]
api_key_env = "GCP_LLM_API_KEY"
default_timeout_ms = 3000

[providers.llamacpp_gcp]
name = "llama.cpp (GCP)"
endpoint = "http://127.0.0.1:8080"
capabilities = ["chat"]
models = ["mistral-7b-instruct-v0.2-q4_k_m"]
api_key_env = "GCP_LLM_API_KEY"
default_timeout_ms = 3000
""".strip(),
        encoding="utf-8",
    )


def test_registry_uses_providers_toml_without_legacy_aliases(tmp_path, monkeypatch):
    providers_toml = tmp_path / "providers.toml"
    _write_minimal_providers_toml(providers_toml)

    monkeypatch.setenv("PROVIDERS_TOML_PATH", str(providers_toml))
    monkeypatch.setenv("GCP_LLM_API_KEY", "test-key")
    monkeypatch.setenv("OLLAMA_GCP_URL", "http://127.0.0.1:11434")
    monkeypatch.setenv("LLAMACPP_GCP_URL", "http://127.0.0.1:8080")
    monkeypatch.setenv("LOCAL_LLM_API_KEY", "test-key")

    registry = ProviderRegistry(config_file=str(providers_toml))

    ollama = registry.get_provider("ollama_gcp")
    assert ollama is not None
    assert ollama.provider_id == "ollama_gcp"

    assert registry.get_provider("goblin-ollama-server") is None
    assert registry.get_provider("goblin-llamacpp-server") is None
    assert registry.aliases == {}

    catalog = registry.get_provider_catalog()
    assert "ollama_gcp" in catalog
    assert "gemma:2b" in catalog["ollama_gcp"]["models"]


class _FakeProvider:
    def __init__(self, provider_id: str):
        self._provider_id = provider_id

    @property
    def provider_id(self) -> str:
        return self._provider_id

    @property
    def capabilities(self):
        return {
            "models": ["gemma:2b"],
            "max_tokens": {"gemma:2b": 4096},
            "cost_per_token_input": 0.0,
            "cost_per_token_output": 0.0,
        }

    def estimate_cost(self, _request: InferenceRequest) -> float:
        return 0.0

    def infer(self, _request: InferenceRequest):
        raise NotImplementedError

    def health_check(self):
        raise NotImplementedError


class _FakeRegistry:
    def __init__(self, providers):
        self._providers = providers

    def get_available_providers(self):
        return list(self._providers)

    def get_providers_by_capability(self, _capability: str):
        return list(self._providers)


def test_decision_engine_simple_prompt_fast_path_prefers_ollama_gcp():
    engine = DecisionEngine()
    engine.registry = _FakeRegistry(
        [
            _FakeProvider("llamacpp_gcp"),
            _FakeProvider("ollama_gcp"),
            _FakeProvider("openai"),
        ]
    )

    request = InferenceRequest(
        messages=[{"role": "user", "content": "hi"}],
        model="gemma:2b",
        model_family="chat",
    )

    decision = engine.select_provider(request, use_cache=False)

    assert decision.provider_id == "ollama_gcp"
    assert "llamacpp_gcp" in decision.fallback_providers
