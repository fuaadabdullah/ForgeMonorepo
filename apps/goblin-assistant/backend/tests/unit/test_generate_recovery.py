from __future__ import annotations

import importlib
from typing import Any, Dict

import httpx
import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException, Response


class _FakeResponse:
    def __init__(self, url: str, status_code: int, payload: Dict[str, Any]):
        self._url = url
        self.status_code = status_code
        self._payload = payload

    def json(self) -> Dict[str, Any]:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code < 400:
            return
        request = httpx.Request("POST", self._url)
        response = httpx.Response(
            self.status_code,
            request=request,
            json=self._payload,
        )
        raise httpx.HTTPStatusError(
            f"HTTP {self.status_code}",
            request=request,
            response=response,
        )


@pytest.fixture
def main_module(monkeypatch):
    key = Fernet.generate_key().decode()
    monkeypatch.setenv("SETTINGS_ENCRYPTION_KEY", key)
    monkeypatch.setenv("ROUTING_ENCRYPTION_KEY", key)
    monkeypatch.setenv("ALLOW_MEMORY_FALLBACK", "true")
    monkeypatch.setenv("SKIP_RAPTOR_INIT", "1")

    import backend.main as main

    main = importlib.reload(main)
    main._provider_health_cache.clear()
    main._provider_failure_counts.clear()
    main._provider_circuit_open_until.clear()
    main._provider_auth_blocked_until.clear()

    async def _noop_warm() -> None:
        return None

    monkeypatch.setattr(main, "_maybe_warm_gcp_providers", _noop_warm)
    return main


@pytest.mark.asyncio
async def test_simple_prompt_prefers_siliconeflow(main_module, monkeypatch):
    monkeypatch.setenv("SILICONEFLOW_API_KEY", "test-key")
    monkeypatch.setenv("SILICONEFLOW_BASE_URL", "https://silicone.example/v1")
    monkeypatch.delenv("OLLAMA_GCP_URL", raising=False)
    monkeypatch.delenv("LLAMACPP_GCP_URL", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    calls = []

    class _FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url: str, headers=None, json=None):
            calls.append(url)
            if "silicone.example" not in url:
                raise AssertionError(f"unexpected URL {url}")
            return _FakeResponse(
                url=url,
                status_code=200,
                payload={
                    "model": "Qwen/Qwen2.5-7B-Instruct",
                    "choices": [
                        {
                            "message": {"content": "hello"},
                            "finish_reason": "stop",
                        }
                    ],
                    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
                },
            )

        async def get(self, url: str):
            return _FakeResponse(url=url, status_code=200, payload={})

    monkeypatch.setattr(httpx, "AsyncClient", _FakeAsyncClient)

    response = Response()
    result = await main_module._generate_completion(
        request=main_module.GenerateRequest(prompt="hi"),
        correlation_id="cid-simple",
        response=response,
    )

    assert result["provider"] == "siliconeflow"
    assert calls and "silicone.example" in calls[0]
    assert response.headers.get("X-Correlation-ID") == "cid-simple"


@pytest.mark.asyncio
async def test_auth_error_triggers_provider_cooldown(main_module, monkeypatch):
    monkeypatch.setenv("SILICONEFLOW_API_KEY", "bad-key")
    monkeypatch.setenv("SILICONEFLOW_BASE_URL", "https://silicone.example/v1")
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key")
    monkeypatch.delenv("OLLAMA_GCP_URL", raising=False)
    monkeypatch.delenv("LLAMACPP_GCP_URL", raising=False)
    calls = {"siliconeflow": 0, "openai": 0}

    class _FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url: str, headers=None, json=None):
            if "silicone.example" in url:
                calls["siliconeflow"] += 1
                return _FakeResponse(
                    url=url,
                    status_code=401,
                    payload={"error": {"message": "unauthorized"}},
                )
            if "api.openai.com" in url:
                calls["openai"] += 1
                return _FakeResponse(
                    url=url,
                    status_code=200,
                    payload={
                        "model": "gpt-4o-mini",
                        "choices": [
                            {
                                "message": {"content": "ok"},
                                "finish_reason": "stop",
                            }
                        ],
                        "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
                    },
                )
            raise AssertionError(f"unexpected URL {url}")

        async def get(self, url: str):
            return _FakeResponse(url=url, status_code=200, payload={})

    monkeypatch.setattr(httpx, "AsyncClient", _FakeAsyncClient)

    first = await main_module._generate_completion(main_module.GenerateRequest(prompt="hi"))
    second = await main_module._generate_completion(main_module.GenerateRequest(prompt="hi"))

    assert first["provider"] == "openai"
    assert second["provider"] == "openai"
    assert calls["siliconeflow"] == 1
    assert calls["openai"] == 2


@pytest.mark.asyncio
async def test_forced_provider_failure_uses_rfc7807(main_module, monkeypatch):
    monkeypatch.setenv("OLLAMA_GCP_URL", "http://127.0.0.1:11434")
    monkeypatch.setenv("LOCAL_LLM_API_KEY", "local-key")
    monkeypatch.delenv("SILICONEFLOW_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    class _FailingAdapter:
        def __init__(self, *args, **kwargs):
            self.timeout = 1

        async def generate(self, *args, **kwargs):
            raise httpx.ConnectTimeout("timeout")

    monkeypatch.setattr(main_module, "OllamaAdapter", _FailingAdapter)

    response = Response()
    with pytest.raises(HTTPException) as exc_info:
        await main_module._generate_completion(
            request=main_module.GenerateRequest(prompt="hi"),
            forced_provider="ollama_gcp",
            forced_model="gemma:2b",
            correlation_id="cid-forced",
            response=response,
        )

    exc = exc_info.value
    assert exc.status_code == 503
    assert exc.headers.get("X-Correlation-ID") == "cid-forced"
    assert response.headers.get("X-Correlation-ID") == "cid-forced"
    assert exc.detail["title"] == "Service Unavailable"
    assert exc.detail["code"] == main_module.ErrorCodes.SERVICE_UNAVAILABLE
    assert exc.detail["instance"] == "cid-forced"


@pytest.mark.asyncio
async def test_models_routes_include_siliconeflow(main_module):
    routes = await main_module.list_model_routes()
    assert routes["count"] > 0
    assert any(item["provider"] == "siliconeflow" for item in routes["routes"])
