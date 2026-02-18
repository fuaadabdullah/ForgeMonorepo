import os
import time
from dataclasses import dataclass
from typing import Awaitable, Callable, Dict, List, Optional

import httpx

from ..providers.ollama_adapter import OllamaAdapter


@dataclass(frozen=True)
class ProviderContext:
    messages: List[Dict[str, str]]
    prompt: str
    model: str
    provider_hint: str
    req_max_tokens: int
    req_temperature: float
    forced_model: Optional[str]
    forced_provider: Optional[str]
    request_deadline: float


@dataclass(frozen=True)
class ProviderConfig:
    goblin_chat_urls: List[str]
    goblin_chat_key: str
    ollama_url: str
    llamacpp_url: str
    gemini_key: Optional[str]
    groq_key: Optional[str]
    deepseek_key: Optional[str]
    siliconeflow_key: str
    siliconeflow_url: str
    siliconeflow_default_model: str
    openrouter_key: str
    openrouter_url: str
    openrouter_default_model: str
    openai_key: Optional[str]
    anthropic_key: Optional[str]
    ollama_default_model: str
    llamacpp_default_model: str


def load_provider_config() -> ProviderConfig:
    goblin_chat_url_env = (os.getenv("GOBLIN_CHAT_URL") or "").strip()
    goblin_chat_urls = (
        [goblin_chat_url_env]
        if goblin_chat_url_env
        else ["http://goblin-chat.internal:8080", "https://goblin-chat.fly.dev"]
    )

    return ProviderConfig(
        goblin_chat_urls=goblin_chat_urls,
        goblin_chat_key=(
            os.getenv("GOBLIN_CHAT_API_KEY") or os.getenv("GOBLIN_API_KEY") or ""
        ),
        ollama_url=(
            os.getenv("OLLAMA_GCP_URL") or os.getenv("OLLAMA_BASE_URL") or ""
        ).strip(),
        llamacpp_url=(os.getenv("LLAMACPP_GCP_URL") or "").strip(),
        gemini_key=os.getenv("GEMINI_API_KEY"),
        groq_key=os.getenv("GROK_API_KEY") or os.getenv("GROQ_API_KEY"),
        deepseek_key=os.getenv("DEEPSEEK_API_KEY"),
        siliconeflow_key=(os.getenv("SILICONEFLOW_API_KEY") or "").strip(),
        siliconeflow_url=(
            (os.getenv("SILICONEFLOW_BASE_URL") or "https://api.siliconflow.com/v1")
            .strip()
            .rstrip("/")
        ),
        siliconeflow_default_model=(
            os.getenv("SILICONEFLOW_DEFAULT_MODEL") or "Qwen/Qwen2.5-7B-Instruct"
        ).strip(),
        openrouter_key=(os.getenv("OPENROUTER_API_KEY") or "").strip(),
        openrouter_url=(
            (os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1")
            .strip()
            .rstrip("/")
        ),
        openrouter_default_model=(
            os.getenv("OPENROUTER_DEFAULT_MODEL") or "openrouter/auto"
        ).strip(),
        openai_key=os.getenv("OPENAI_API_KEY"),
        anthropic_key=os.getenv("ANTHROPIC_API_KEY"),
        ollama_default_model=(
            os.getenv("OLLAMA_GCP_DEFAULT_MODEL") or "gemma:2b"
        ).strip(),
        llamacpp_default_model=(
            os.getenv("LLAMACPP_GCP_DEFAULT_MODEL") or "phi-3-mini-4k-instruct-q4"
        ).strip(),
    )


def build_provider_attempts(
    context: ProviderContext,
    config: ProviderConfig,
    provider_timeout: Callable[[str], httpx.Timeout],
) -> Dict[str, Callable[[], Awaitable[Dict[str, object]]]]:
    async def _call_siliconeflow() -> Dict[str, object]:
        siliconeflow_model = (
            context.model
            if context.provider_hint == "siliconeflow"
            else config.siliconeflow_default_model
        )
        async with httpx.AsyncClient(
            timeout=provider_timeout("siliconeflow")
        ) as client:
            provider_response = await client.post(
                f"{config.siliconeflow_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.siliconeflow_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": siliconeflow_model,
                    "messages": context.messages,
                    "max_tokens": context.req_max_tokens,
                    "temperature": context.req_temperature,
                },
            )
            provider_response.raise_for_status()
            data = provider_response.json()
            content = data["choices"][0]["message"]["content"]
            return {
                "content": content,
                "response": content,
                "usage": data.get("usage", {}),
                "model": data.get("model", siliconeflow_model),
                "provider": "siliconeflow",
                "finish_reason": data["choices"][0].get("finish_reason", "stop"),
            }

    async def _call_ollama_gcp() -> Dict[str, object]:
        adapter = OllamaAdapter(
            api_key=os.getenv("LOCAL_LLM_API_KEY"),
            base_url=config.ollama_url,
        )
        ollama_model = context.model
        if not context.forced_model and context.model == "llama2":
            ollama_model = config.ollama_default_model
        max_adapter_timeout = 15 if context.forced_provider else 8
        adapter.timeout = int(
            max(1, min(max_adapter_timeout, context.request_deadline - time.time()))
        )
        result = await adapter.generate(
            context.messages,
            model=ollama_model,
            max_tokens=context.req_max_tokens,
            temperature=context.req_temperature,
        )
        if (
            isinstance(result, dict)
            and "content" in result
            and "response" not in result
        ):
            result["response"] = result.get("content") or ""
        if isinstance(result, dict):
            result.setdefault("provider", "ollama_gcp")
            result.setdefault("model", ollama_model)
        return result

    async def _call_llamacpp_gcp() -> Dict[str, object]:
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        local_key = (os.getenv("LOCAL_LLM_API_KEY") or "").strip()
        if local_key:
            headers["x-api-key"] = local_key
        llamacpp_model = context.model
        if not context.forced_model and context.model == "llama2":
            llamacpp_model = config.llamacpp_default_model
        async with httpx.AsyncClient(
            timeout=provider_timeout("llamacpp_gcp")
        ) as client:
            payload = {
                "model": llamacpp_model,
                "messages": context.messages,
                "max_tokens": context.req_max_tokens,
                "temperature": context.req_temperature,
            }
            data: Dict[str, object] = {}
            content = ""
            for path in ("/chat/completions", "/v1/chat/completions"):
                provider_response = await client.post(
                    f"{config.llamacpp_url.rstrip('/')}{path}",
                    headers=headers,
                    json=payload,
                )
                if provider_response.status_code in {404, 405}:
                    continue
                provider_response.raise_for_status()
                data = provider_response.json()
                content = (
                    ((data.get("choices") or [{}])[0].get("message") or {}).get(
                        "content"
                    )
                    or data.get("content")
                    or data.get("response")
                    or ""
                )
                if content:
                    break

            if not content:
                completion_response = await client.post(
                    f"{config.llamacpp_url.rstrip('/')}/completion",
                    headers=headers,
                    json={
                        "prompt": context.prompt,
                        "n_predict": context.req_max_tokens,
                        "temperature": context.req_temperature,
                        "stream": False,
                    },
                )
                completion_response.raise_for_status()
                data = completion_response.json()
                content = data.get("content") or data.get("response") or ""

            if not content:
                raise RuntimeError("llama.cpp returned empty content")

            return {
                "content": content,
                "response": content,
                "usage": data.get("usage", {}),
                "model": data.get("model", llamacpp_model),
                "provider": "llamacpp_gcp",
                "finish_reason": ((data.get("choices") or [{}])[0]).get(
                    "finish_reason", "stop"
                ),
            }

    async def _call_gemini() -> Dict[str, object]:
        async with httpx.AsyncClient(timeout=provider_timeout("gemini")) as client:
            provider_response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={config.gemini_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": context.prompt}]}],
                    "generationConfig": {"maxOutputTokens": context.req_max_tokens},
                },
            )
            provider_response.raise_for_status()
            data = provider_response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            usage_meta = data.get("usageMetadata", {})
            return {
                "content": text,
                "response": text,
                "usage": {
                    "prompt_tokens": usage_meta.get("promptTokenCount", 0),
                    "completion_tokens": usage_meta.get("candidatesTokenCount", 0),
                    "total_tokens": usage_meta.get("totalTokenCount", 0),
                },
                "model": "gemini-2.0-flash",
                "provider": "gemini",
                "finish_reason": data["candidates"][0].get("finishReason", "STOP"),
            }

    async def _call_deepseek() -> Dict[str, object]:
        async with httpx.AsyncClient(timeout=provider_timeout("deepseek")) as client:
            provider_response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.deepseek_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": context.messages,
                    "max_tokens": context.req_max_tokens,
                },
            )
            provider_response.raise_for_status()
            data = provider_response.json()
            content = data["choices"][0]["message"]["content"]
            return {
                "content": content,
                "response": content,
                "usage": data.get("usage", {}),
                "model": data.get("model", "deepseek-chat"),
                "provider": "deepseek",
                "finish_reason": data["choices"][0].get("finish_reason", "stop"),
            }

    async def _call_openrouter() -> Dict[str, object]:
        openrouter_model = context.model
        if not context.forced_model and context.model == "llama2":
            openrouter_model = config.openrouter_default_model

        async with httpx.AsyncClient(timeout=provider_timeout("openrouter")) as client:
            provider_response = await client.post(
                f"{config.openrouter_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.openrouter_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": openrouter_model,
                    "messages": context.messages,
                    "max_tokens": context.req_max_tokens,
                    "temperature": context.req_temperature,
                },
            )
            provider_response.raise_for_status()
            data = provider_response.json()
            content = data["choices"][0]["message"]["content"]
            return {
                "content": content,
                "response": content,
                "usage": data.get("usage", {}),
                "model": data.get("model", openrouter_model),
                "provider": "openrouter",
                "finish_reason": data["choices"][0].get("finish_reason", "stop"),
            }

    async def _call_openai() -> Dict[str, object]:
        async with httpx.AsyncClient(timeout=provider_timeout("openai")) as client:
            provider_response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": context.messages,
                    "max_tokens": context.req_max_tokens,
                },
            )
            provider_response.raise_for_status()
            data = provider_response.json()
            content = data["choices"][0]["message"]["content"]
            return {
                "content": content,
                "response": content,
                "usage": data.get("usage", {}),
                "model": data.get("model", "gpt-4o-mini"),
                "provider": "openai",
                "finish_reason": data["choices"][0].get("finish_reason", "stop"),
            }

    async def _call_anthropic() -> Dict[str, object]:
        async with httpx.AsyncClient(timeout=provider_timeout("anthropic")) as client:
            provider_response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": config.anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": context.req_max_tokens,
                    "messages": context.messages,
                },
            )
            provider_response.raise_for_status()
            data = provider_response.json()
            content = data["content"][0]["text"]
            return {
                "content": content,
                "response": content,
                "usage": data.get("usage", {}),
                "model": data.get("model", "claude-3-haiku-20240307"),
                "provider": "anthropic",
                "finish_reason": data.get("stop_reason", "stop"),
            }

    async def _call_groq() -> Dict[str, object]:
        async with httpx.AsyncClient(timeout=provider_timeout("groq")) as client:
            provider_response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": context.messages,
                    "max_tokens": context.req_max_tokens,
                },
            )
            provider_response.raise_for_status()
            data = provider_response.json()
            content = data["choices"][0]["message"]["content"]
            return {
                "content": content,
                "response": content,
                "usage": data.get("usage", {}),
                "model": data.get("model", "llama-3.1-8b-instant"),
                "provider": "groq",
                "finish_reason": data["choices"][0].get("finish_reason", "stop"),
            }

    async def _call_goblin_chat() -> Dict[str, object]:
        for goblin_chat_url in config.goblin_chat_urls:
            goblin_chat_url = (goblin_chat_url or "").rstrip("/")
            if not goblin_chat_url:
                continue
            headers = {"Content-Type": "application/json"}
            if config.goblin_chat_key:
                headers["Authorization"] = f"Bearer {config.goblin_chat_key}"
            async with httpx.AsyncClient(
                timeout=provider_timeout("goblin-chat")
            ) as client:
                provider_response = await client.post(
                    f"{goblin_chat_url}/v1/chat/completions",
                    headers=headers,
                    json={
                        "messages": context.messages,
                        "max_tokens": context.req_max_tokens,
                        "temperature": context.req_temperature,
                        "stream": False,
                    },
                )
                provider_response.raise_for_status()
                data = provider_response.json()
                choice = (data.get("choices") or [{}])[0]
                content = (choice.get("message") or {}).get("content") or ""
                if content:
                    return {
                        "content": content,
                        "response": content,
                        "usage": data.get("usage", {}),
                        "model": data.get("model", "goblin-chat"),
                        "provider": "goblin-chat",
                        "finish_reason": choice.get("finish_reason", "stop"),
                    }
        raise RuntimeError("goblin-chat returned empty content")

    return {
        "siliconeflow": _call_siliconeflow,
        "ollama_gcp": _call_ollama_gcp,
        "llamacpp_gcp": _call_llamacpp_gcp,
        "gemini": _call_gemini,
        "deepseek": _call_deepseek,
        "openrouter": _call_openrouter,
        "openai": _call_openai,
        "anthropic": _call_anthropic,
        "groq": _call_groq,
        "goblin-chat": _call_goblin_chat,
    }
