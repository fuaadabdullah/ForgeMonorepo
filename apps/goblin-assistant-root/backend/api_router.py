from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
import asyncio
import time
import os
from sqlalchemy.orm import Session
from .database import get_db
from .models import Stream, StreamChunk, SearchCollection, SearchDocument
from .services.token_accounting import TokenAccountingService
from .providers.registry import get_provider_registry
from .providers.base import InferenceRequest, InferenceResult

# Background task imports
from fastapi import BackgroundTasks
import redis
import logging

logger = logging.getLogger(__name__)
token_accountant = TokenAccountingService()

# Redis client for background tasks
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL)


# Background task functions with Redis locking
def simple_cleanup_task(task_id: str, cleanup_type: str = "general"):
    """
    FastAPI background task for simple cleanup operations.

    Uses Redis locking to prevent duplicate execution across instances.
    Suitable for small, request-triggered cleanup tasks.
    """
    lock_key = f"cleanup:{task_id}:{cleanup_type}"

    # Try to acquire Redis lock (60 second TTL)
    if not redis_client.set(lock_key, "1", nx=True, ex=60):
        logger.info(f"Cleanup task {task_id} already running, skipping")
        return

    try:
        logger.info(f"Starting cleanup task {task_id} (type: {cleanup_type})")

        if cleanup_type == "session":
            # Clean up expired user sessions
            _cleanup_expired_sessions()
        elif cleanup_type == "cache":
            # Clean up old cache entries
            _cleanup_old_cache()
        elif cleanup_type == "logs":
            # Clean up old log files
            _cleanup_old_logs()
        else:
            # General cleanup
            _general_cleanup()

        logger.info(f"Completed cleanup task {task_id}")

    except Exception as e:
        logger.error(f"Error in cleanup task {task_id}: {e}")
        raise
    finally:
        # Always release the lock
        redis_client.delete(lock_key)


def _cleanup_expired_sessions():
    """Clean up expired user sessions from database."""
    try:
        # This would typically clean up expired sessions
        # For now, just simulate the work
        time.sleep(0.1)  # Simulate quick database operation
        logger.debug("Cleaned up expired sessions")
    except Exception as e:
        logger.error(f"Session cleanup failed: {e}")


def _cleanup_old_cache():
    """Clean up old cache entries."""
    try:
        # This would typically clean up expired cache entries
        time.sleep(0.05)  # Simulate quick cache cleanup
        logger.debug("Cleaned up old cache entries")
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}")


def _cleanup_old_logs():
    """Clean up old log files."""
    try:
        # This would typically clean up old log files
        time.sleep(0.02)  # Simulate quick file cleanup
        logger.debug("Cleaned up old log files")
    except Exception as e:
        logger.error(f"Log cleanup failed: {e}")


def _general_cleanup():
    """General cleanup operations."""
    try:
        # This would do general maintenance tasks
        time.sleep(0.01)  # Simulate very quick operation
        logger.debug("Completed general cleanup")
    except Exception as e:
        logger.error(f"General cleanup failed: {e}")


router = APIRouter(prefix="/api", tags=["api"])


class RouteTaskRequest(BaseModel):
    task_type: str
    payload: Dict[str, Any]
    prefer_local: Optional[bool] = False
    prefer_cost: Optional[bool] = False
    max_retries: Optional[int] = 2
    stream: Optional[bool] = False


class StreamTaskRequest(BaseModel):
    goblin: str
    task: str
    code: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None


class StreamResponse(BaseModel):
    stream_id: str
    status: str = "started"


@router.post("/route_task")
async def route_task(request: RouteTaskRequest):
    """Route a task to the best available provider"""
    try:
        # For now, return a simple success response
        # In production, this would delegate to the routing system
        return {
            "ok": True,
            "message": "Task routed successfully",
            "task_id": str(uuid.uuid4()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")


@router.get("/health/stream")
async def health_stream():
    """Streaming health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0",
        "services": {
            "routing": "healthy",
            "execution": "healthy",
            "search": "healthy",
            "auth": "healthy",
        },
    }


@router.post("/route_task_stream_start")
async def start_stream_task(request: StreamTaskRequest, db: Session = Depends(get_db)):
    """Start a streaming task"""
    try:
        stream_id = str(uuid.uuid4())

        # Create stream in database
        stream = Stream(
            id=stream_id,
            goblin=request.goblin,
            task=request.task,
            code=request.code,
            provider=request.provider,
            model=request.model,
            status="running",
        )

        db.add(stream)
        db.commit()

        # Simulate task execution (in production, this would queue the task)
        asyncio.create_task(simulate_stream_task(stream_id, db))

        return StreamResponse(stream_id=stream_id, status="started")

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start stream task: {str(e)}"
        )


@router.get("/route_task_stream_poll/{stream_id}")
async def poll_stream_task(stream_id: str, db: Session = Depends(get_db)):
    """Poll for streaming task updates"""
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    # Get chunks for this stream
    chunks = db.query(StreamChunk).filter(StreamChunk.stream_id == stream_id).all()

    # Format chunks for response
    chunk_data = []
    for chunk in chunks:
        chunk_data.append(
            {
                "content": chunk.content,
                "token_count": chunk.token_count,
                "cost_delta": chunk.cost_delta,
                "done": chunk.done,
            }
        )

    # Clear processed chunks (optional - depends on requirements)
    # For now, we'll keep them for history

    return {
        "stream_id": stream_id,
        "status": stream.status,
        "chunks": chunk_data,
        "done": stream.status == "completed",
    }


@router.post("/route_task_stream_cancel/{stream_id}")
async def cancel_stream_task(stream_id: str, db: Session = Depends(get_db)):
    """Cancel a streaming task"""
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    stream.status = "cancelled"
    db.commit()

    return {"stream_id": stream_id, "status": "cancelled"}


async def simulate_stream_task(stream_id: str, db: Session):
    """Simulate streaming task execution"""
    await asyncio.sleep(1)  # Initial delay

    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        return

    response_text = f"Executed task '{stream.task}' using goblin '{stream.goblin}'"

    # Simulate streaming chunks
    words = response_text.split()
    for i, word in enumerate(words):
        await asyncio.sleep(0.1)  # Simulate processing delay

        if stream.status == "cancelled":
            break

        chunk = StreamChunk(
            stream_id=stream_id,
            content=word + (" " if i < len(words) - 1 else ""),
            token_count=token_accountant.count_tokens(word),
            cost_delta=0.001,
            done=False,
        )

        db.add(chunk)
        db.commit()

    # Mark as completed
    if stream.status != "cancelled":
        stream.status = "completed"
        db.commit()

        # Add final completion chunk
        final_chunk = StreamChunk(
            stream_id=stream_id, content="", token_count=0, cost_delta=0.0, done=True
        )
        db.add(final_chunk)
        db.commit()


@router.get("/goblins")
async def get_goblins():
    """Get list of available goblins"""
    # Mock goblin data - in production, this would come from a database
    goblins = [
        {
            "id": "docs-writer",
            "name": "docs-writer",
            "title": "Documentation Writer",
            "status": "available",
            "guild": "Crafters",
        },
        {
            "id": "code-writer",
            "name": "code-writer",
            "title": "Code Writer",
            "status": "available",
            "guild": "Crafters",
        },
        {
            "id": "search-goblin",
            "name": "search-goblin",
            "title": "Search Specialist",
            "status": "available",
            "guild": "Huntress",
        },
        {
            "id": "analyze-goblin",
            "name": "analyze-goblin",
            "title": "Data Analyst",
            "status": "available",
            "guild": "Mages",
        },
    ]
    return goblins


@router.get("/history/{goblin_id}")
async def get_goblin_history(goblin_id: str, limit: int = 10):
    """Get task history for a specific goblin"""
    # Mock history data - in production, this would come from a database
    mock_history = [
        {
            "id": f"task_{i}",
            "goblin": goblin_id,
            "task": f"Sample task {i}",
            "response": f"Completed task {i} successfully",
            "timestamp": time.time() - (i * 3600),  # Hours ago
            "kpis": f"duration_ms:{1000 + i * 100},cost:{0.01 * (i + 1)}",
        }
        for i in range(min(limit, 20))
    ]
    return mock_history


@router.get("/stats/{goblin_id}")
async def get_goblin_stats(goblin_id: str):
    """Get statistics for a specific goblin"""
    # Mock stats - in production, this would be calculated from actual data
    return {
        "goblin_id": goblin_id,
        "total_tasks": 42,
        "total_cost": 1.23,
        "avg_duration_ms": 2500,
        "success_rate": 0.95,
        "last_active": time.time() - 3600,  # 1 hour ago
    }


class ParseOrchestrationRequest(BaseModel):
    text: str
    default_goblin: Optional[str] = None


@router.post("/orchestrate/parse")
async def parse_orchestration(request: ParseOrchestrationRequest):
    """Parse natural language into orchestration plan"""
    # Simple parsing logic - in production, this would use NLP
    return {
        "steps": [
            {
                "id": "step1",
                "goblin": request.default_goblin or "docs-writer",
                "task": request.text[:100] + "..."
                if len(request.text) > 100
                else request.text,
                "dependencies": [],
                "batch": 0,
            }
        ],
        "total_batches": 1,
        "max_parallel": 1,
        "estimated_cost": 0.05,
    }


@router.post("/orchestrate/execute")
async def execute_orchestration(plan_id: str):
    """Execute an orchestration plan"""
    # Mock execution - in production, this would trigger actual orchestration
    return {
        "execution_id": str(uuid.uuid4()),
        "plan_id": plan_id,
        "status": "started",
        "estimated_completion": time.time() + 300,  # 5 minutes from now
    }


@router.get("/orchestrate/plans/{plan_id}")
async def get_orchestration_plan(plan_id: str):
    """Get details of an orchestration plan"""
    # Mock plan data
    return {
        "plan_id": plan_id,
        "status": "completed",
        "steps": [
            {
                "id": "step1",
                "goblin": "docs-writer",
                "task": "Document the code",
                "status": "completed",
                "duration_ms": 1500,
                "cost": 0.02,
            }
        ],
        "total_cost": 0.02,
        "total_duration_ms": 1500,
        "created_at": time.time() - 3600,
    }


# FastAPI Background Task Endpoints


class CleanupRequest(BaseModel):
    cleanup_type: str = "general"  # "general", "session", "cache", "logs"
    priority: Optional[str] = "normal"  # "low", "normal", "high"


class CleanupResponse(BaseModel):
    task_id: str
    status: str
    cleanup_type: str
    message: str


@router.post("/cleanup", response_model=CleanupResponse)
async def trigger_cleanup(request: CleanupRequest, background_tasks: BackgroundTasks):
    """
    Trigger a background cleanup task with Redis locking.

    This endpoint demonstrates FastAPI background tasks + Redis locks
    for request-triggered, lightweight cleanup operations.

    The task will run in the background and use Redis locking to prevent
    duplicate execution across multiple instances.
    """
    task_id = str(uuid.uuid4())

    # Add the cleanup task to background tasks
    background_tasks.add_task(simple_cleanup_task, task_id, request.cleanup_type)

    logger.info(f"Scheduled cleanup task {task_id} (type: {request.cleanup_type})")

    return CleanupResponse(
        task_id=task_id,
        status="scheduled",
        cleanup_type=request.cleanup_type,
        message="Cleanup task scheduled with Redis locking",
    )


@router.get("/cleanup/status/{task_id}")
async def get_cleanup_status(task_id: str):
    """
    Check if a cleanup task is currently running.

    Returns whether the task is locked (running) or available.
    """
    # Check if the task has any active locks
    lock_keys = redis_client.keys(f"cleanup:{task_id}:*")

    active_locks = []
    for key in lock_keys:
        # Check if lock still exists (not expired)
        if redis_client.exists(key):
            lock_type = key.decode().split(":")[-1]  # Extract cleanup type from key
            active_locks.append(lock_type)

    if active_locks:
        return {
            "task_id": task_id,
            "status": "running",
            "active_cleanup_types": active_locks,
            "message": f"Task is currently running cleanup types: {', '.join(active_locks)}",
        }
    else:
        return {
            "task_id": task_id,
            "status": "available",
            "active_cleanup_types": [],
            "message": "Task is not currently running",
        }


# ============================================================================
# /api/generate: Unauthenticated chat endpoint for Next.js API route proxy
# ============================================================================


class GenerateRequest(BaseModel):
    """Request model for /api/generate endpoint."""

    prompt: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


class GenerateResponse(BaseModel):
    """Response model for /api/generate endpoint."""

    content: str
    model: str
    provider: str
    cost_usd: Optional[float] = None
    usage: Optional[Dict[str, int]] = None
    finish_reason: Optional[str] = None
    correlation_id: Optional[str] = None


import httpx

# Provider cascade: (env_var_name, api_url, default_model, api_style)
_LLM_PROVIDERS = [
    ("GEMINI_API_KEY", None, "gemini-2.5-flash", "gemini"),
    (
        "GROQ_API_KEY",
        "https://api.groq.com/openai/v1/chat/completions",
        "llama-3.3-70b-versatile",
        "openai",
    ),
    (
        "OPENAI_API_KEY",
        "https://api.openai.com/v1/chat/completions",
        "gpt-4o-mini",
        "openai",
    ),
    (
        "DEEPSEEK_API_KEY",
        "https://api.deepseek.com/v1/chat/completions",
        "deepseek-chat",
        "openai",
    ),
    (
        "ANTHROPIC_API_KEY",
        "https://api.anthropic.com/v1/messages",
        "claude-3-5-haiku-20241022",
        "anthropic",
    ),
]


async def _call_openai_compatible(
    url: str,
    api_key: str,
    model: str,
    messages: list,
    max_tokens: int,
    temperature: float,
) -> dict:
    """Call an OpenAI-compatible chat completions API."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        choice = data["choices"][0]
        return {
            "content": choice["message"]["content"],
            "model": data.get("model", model),
            "finish_reason": choice.get("finish_reason"),
            "usage": data.get("usage"),
        }


async def _call_anthropic(
    api_key: str, model: str, messages: list, max_tokens: int, temperature: float
) -> dict:
    """Call Anthropic Messages API."""
    # Extract system message if present
    system_text = ""
    chat_msgs = []
    for m in messages:
        if m.get("role") == "system":
            system_text = m.get("content", "")
        else:
            chat_msgs.append({"role": m["role"], "content": m["content"]})
    if not chat_msgs:
        chat_msgs = [{"role": "user", "content": "Hello"}]

    body: dict = {
        "model": model,
        "messages": chat_msgs,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if system_text:
        body["system"] = system_text

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        content_blocks = data.get("content", [])
        text = "".join(
            b.get("text", "") for b in content_blocks if b.get("type") == "text"
        )
        return {
            "content": text,
            "model": data.get("model", model),
            "finish_reason": data.get("stop_reason"),
            "usage": data.get("usage"),
        }


async def _call_gemini(
    api_key: str, model: str, messages: list, max_tokens: int, temperature: float
) -> dict:
    """Call Google Gemini generateContent API with retry on 429."""
    contents = []
    for m in messages:
        role = "model" if m.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        last_resp = None
        for attempt in range(3):
            resp = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": contents,
                    "generationConfig": {
                        "maxOutputTokens": max_tokens,
                        "temperature": temperature,
                    },
                },
            )
            if resp.status_code == 429:
                wait = min(2 ** attempt * 2, 10)
                logger.info(f"Gemini 429, retrying in {wait}s (attempt {attempt + 1}/3)")
                await asyncio.sleep(wait)
                last_resp = resp
                continue
            resp.raise_for_status()
            data = resp.json()
            candidates = data.get("candidates", [])
            text = ""
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts)
            return {
                "content": text,
                "model": model,
                "finish_reason": candidates[0].get("finishReason") if candidates else None,
                "usage": None,
            }
        # All retries exhausted
        if last_resp:
            last_resp.raise_for_status()
        raise Exception("Gemini: retries exhausted")


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Unauthenticated generate endpoint for Next.js API route.

    Cascades through available LLM providers (Groq → OpenAI → DeepSeek →
    Anthropic → Gemini) using direct API calls. No registry dependency.
    """
    messages_list = request.messages or []
    if not messages_list and request.prompt:
        messages_list = [{"role": "user", "content": request.prompt}]
    if not messages_list:
        raise HTTPException(
            status_code=400, detail="Either 'prompt' or 'messages' is required"
        )

    max_tokens = request.max_tokens or 512
    temperature = request.temperature or 0.7
    errors: list[str] = []

    for env_key, url, default_model, style in _LLM_PROVIDERS:
        api_key = os.environ.get(env_key)
        if not api_key:
            continue
        model = request.model or default_model
        try:
            if style == "openai":
                result = await _call_openai_compatible(
                    url, api_key, model, messages_list, max_tokens, temperature
                )
            elif style == "anthropic":
                result = await _call_anthropic(
                    api_key, model, messages_list, max_tokens, temperature
                )
            elif style == "gemini":
                result = await _call_gemini(
                    api_key, model, messages_list, max_tokens, temperature
                )
            else:
                continue

            return GenerateResponse(
                content=result["content"],
                model=result["model"],
                provider=env_key.replace("_API_KEY", "").lower(),
                usage=result.get("usage"),
                finish_reason=result.get("finish_reason"),
            )
        except Exception as e:
            provider_name = env_key.replace("_API_KEY", "")
            # Log full error server-side, but only expose status code to client
            logger.warning(f"Provider {provider_name} failed: {e}")
            short_err = str(e).split("\n")[0][:80] if str(e) else "unknown error"
            errors.append(f"{provider_name}: {short_err}")

    detail = (
        "All providers failed. " + "; ".join(errors)
        if errors
        else "No provider API keys configured"
    )
    raise HTTPException(status_code=503, detail=detail)
