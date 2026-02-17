"""
Stream Router — Server-Sent Events (SSE) endpoint.

Provides real streaming responses backed by the provider registry.
Supports both:
  POST /v1/stream  — OpenAI-compatible chat completion stream (preferred)
  GET  /v1/stream  — Legacy goblin-task-style streaming (backward compat)
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, AsyncIterator, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .auth.dependencies import require_scope
from .auth.policies import AuthScope
from .providers.registry import get_provider_registry
from .providers.base import InferenceRequest, HealthStatus
from .services.token_accounting import TokenAccountingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["stream"])
token_accountant = TokenAccountingService()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class StreamChatMessage(BaseModel):
    role: str
    content: str


class StreamChatRequest(BaseModel):
    messages: List[StreamChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


# ---------------------------------------------------------------------------
# Streaming helpers
# ---------------------------------------------------------------------------


async def _stream_from_provider(
    request: StreamChatRequest,
) -> AsyncIterator[str]:
    """Yield SSE chunks from the best available provider."""
    registry = get_provider_registry()
    available = registry.get_available_providers()

    if not available:
        error_payload = json.dumps({"error": "No providers available", "done": True})
        yield f"data: {error_payload}\n\n"
        return

    # Pick first available provider; scorer / selector handle priority elsewhere
    provider = available[0]
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    # Pick a model: honour the request, then fall back to provider default
    models = provider.capabilities.get("models", [])
    model = (
        request.model
        if request.model and request.model in models
        else (models[0] if models else "gpt-3.5-turbo")
    )

    # Yield started event
    yield f"data: {json.dumps({'status': 'started', 'provider': provider.provider_id, 'model': model})}\n\n"

    # Build inference request
    inf_req = InferenceRequest(
        messages=messages,
        model=model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        stream=True,
    )

    # Attempt native streaming via the openai client if available
    openai_client = getattr(provider, "client", None)
    if openai_client is not None:
        try:
            params: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "stream": True,
            }
            if request.temperature is not None:
                params["temperature"] = request.temperature
            if request.max_tokens is not None:
                params["max_tokens"] = request.max_tokens

            total_tokens = 0
            start_ms = time.monotonic()

            # openai v1 SDK — streaming via context manager
            with openai_client.chat.completions.create(**params) as stream:
                for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    content = delta.content or ""
                    if content:
                        tok_count = token_accountant.count_tokens(content)
                        total_tokens += tok_count
                        chunk_data = {
                            "content": content,
                            "token_count": tok_count,
                            "done": False,
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                        await asyncio.sleep(0)  # yield control

            duration_ms = int((time.monotonic() - start_ms) * 1000)
            cost = total_tokens * provider.capabilities.get("cost_per_token_output", 0.002)
            completion_data = {
                "tokens": total_tokens,
                "cost": round(cost, 6),
                "model": model,
                "provider": provider.provider_id,
                "duration_ms": duration_ms,
                "done": True,
            }
            yield f"data: {json.dumps(completion_data)}\n\n"
            return

        except Exception as exc:
            logger.warning(
                "Native streaming failed for provider %s, falling back to non-streaming: %s",
                provider.provider_id,
                exc,
            )

    # Fallback: non-streaming infer then emit whole response as one chunk
    try:
        result = provider.infer(inf_req)
        content = result.content or ""
        tok_count = result.usage.get("total_tokens", token_accountant.count_tokens(content))
        cost = tok_count * provider.capabilities.get("cost_per_token_output", 0.002)

        if content:
            yield f"data: {json.dumps({'content': content, 'token_count': tok_count, 'done': False})}\n\n"
            await asyncio.sleep(0)

        yield f"data: {json.dumps({'tokens': tok_count, 'cost': round(cost, 6), 'model': model, 'provider': provider.provider_id, 'duration_ms': result.latency_ms, 'done': True})}\n\n"

    except Exception as exc:
        logger.error("Provider inference failed during streaming: %s", exc)
        yield f"data: {json.dumps({'error': str(exc), 'done': True})}\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("")
async def stream_chat_post(
    request: StreamChatRequest,
    _scopes: List[str] = Depends(require_scope(AuthScope.WRITE_CONVERSATIONS)),
) -> StreamingResponse:
    """
    Stream a chat completion (POST, preferred).

    Body: { messages: [{role, content}], model?, temperature?, max_tokens? }
    Returns SSE stream.
    """
    return StreamingResponse(
        _stream_from_provider(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("")
async def stream_task_get(
    task_id: str,
    goblin: str = "default",
    task: str = "default task",
    _scopes: List[str] = Depends(require_scope(AuthScope.WRITE_CONVERSATIONS)),
) -> StreamingResponse:
    """
    Legacy GET-based stream endpoint (backward compat).

    Converts the task description into a single-turn chat message and streams
    the response from the best available provider.
    """
    synthetic_request = StreamChatRequest(
        messages=[
            StreamChatMessage(
                role="system", content="You are a helpful AI assistant called Goblin."
            ),
            StreamChatMessage(role="user", content=f"Execute task: {task}"),
        ]
    )
    return StreamingResponse(
        _stream_from_provider(synthetic_request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
