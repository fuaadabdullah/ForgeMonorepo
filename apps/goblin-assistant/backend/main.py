import os
import asyncio
import time
import uuid
from contextlib import asynccontextmanager
from urllib.parse import quote, unquote
from typing import Any, Awaitable, Callable, Dict, List, Optional
from fastapi import FastAPI, Body, APIRouter, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Initialize monitoring first (before other imports)
from .monitoring import init_sentry
from .opentelemetry_config import init_opentelemetry, instrument_fastapi_app

init_sentry()
init_opentelemetry()

# Import middleware
from .middleware.rate_limiter import RateLimitMiddleware, limiter
from .middleware.logging_middleware import StructuredLoggingMiddleware, setup_logging
from .middleware.request_id_middleware import RequestIDMiddleware
from .middleware.security_headers import SecurityHeadersMiddleware

# Import routers
from .debugger.router import router as debugger_router
from .providers.ollama_adapter import OllamaAdapter
from .providers.registry import get_provider_registry

try:  # Prefer full implementation
    from .auth.router import router as auth_router, cleanup_expired_challenges  # type: ignore
except Exception:  # noqa: BLE001
    try:
        from .auth.router import router as auth_router  # type: ignore
    except Exception:  # noqa: BLE001
        # As a last resort define a minimal router stub to keep app booting.
        from fastapi import APIRouter

        auth_router = APIRouter()

    async def cleanup_expired_challenges():  # type: ignore
        """Fallback no-op when real cleanup function is unavailable.
        Returns 0 to indicate no challenges were cleaned.
        """
        return 0


from .search_router import router as search_router
from .settings_router import router as settings_router
from .execute_router import router as execute_router
from .auth.api_keys_router import router as api_keys_router
from .auth.auth_router import router as jwt_auth_router
from .parse_router import router as parse_router
from .routing_router import router as routing_router
from .chat_router import router as chat_router
from .routers.essay_router import router as essay_router
from .api_router import router as api_router
from .stream_router import router as stream_router
from .sandbox_router import router as sandbox_router
from .health_router import router as health_router
from .health.llm_health import router as llm_health_router
from .dashboard_router import router as dashboard_router
from .rag_router import router as rag_router
from .routers.goblins_router import router as goblins_router
from .routers.cost_router import router as cost_router
from .routers.user_auth_router import router as user_auth_router
from .support_router import router as support_router
from .providers_management_router import router as providers_management_router
from .account_router import router as account_router

# Multi-cloud orchestrator
try:
    from .orchestrator import orchestrator_router
except ImportError:
    from fastapi import APIRouter

    orchestrator_router = APIRouter()

try:
    from .raptor_router import router as raptor_router
except ImportError:
    # Create a stub router if raptor_mini is not available
    from fastapi import APIRouter

    raptor_router = APIRouter()

# Database imports
from .database import create_tables, SessionLocal
from .seed import seed_database
from .errors import ErrorCodes, raise_problem

# Add GoblinOS to path for raptor
try:
    from raptor_mini import raptor  # type: ignore
except ImportError:

    class _RaptorStub:
        def start(self):
            print("Raptor stub start (module not found)")

        def stop(self):
            print("Raptor stub stop (module not found)")

    raptor = _RaptorStub()


async def validate_startup_configuration():
    """Validate critical configuration and dependencies before server starts"""
    print("🔍 Validating startup configuration...")

    issues = []
    settings = None

    # Check configuration
    try:
        from .config import settings

        print(
            f"✅ Configuration loaded: environment={settings.environment}, instances={settings.instance_count}"
        )

        # Validate production requirements
        if settings.is_production and not settings.database_url:
            issues.append("DATABASE_URL required in production environment")

        if (
            settings.is_production
            and settings.allow_memory_fallback
            and settings.is_multi_instance
        ):
            issues.append("Memory fallback not allowed in multi-instance production")

        if settings.is_production and not os.getenv("ROUTING_ENCRYPTION_KEY"):
            issues.append(
                "ROUTING_ENCRYPTION_KEY required in production for chat routing"
            )

    except ImportError:
        issues.append("Configuration system not available")
    except Exception as e:
        issues.append(f"Configuration validation failed: {e}")

    # Check critical dependencies
    try:
        from .scripts.check_dependencies import check_pydantic_email, check_redis

        if not check_pydantic_email():
            issues.append("Email validation dependencies not properly configured")
        redis_available = check_redis()
        if (
            settings is not None
            and not redis_available
            and settings.is_production
            and settings.is_multi_instance
        ):
            issues.append(
                "Redis required but not available in multi-instance production"
            )
    except ImportError:
        print("⚠️  Dependency checker not available - skipping automated checks")
    except Exception as e:
        issues.append(f"Dependency validation failed: {e}")

    # Report issues
    if issues:
        print("❌ Startup validation failed:")
        for issue in issues:
            print(f"  - {issue}")
        print(
            "\n🚨 Critical configuration issues detected. Server may not function properly."
        )
        print("   Check the issues above and fix before proceeding to production.")
        # Don't exit - allow server to start with warnings for development
        if settings is not None and settings.is_production:
            print(
                "   In production environment, these issues should be resolved immediately."
            )
    else:
        print("✅ Startup validation passed - all systems ready")

    return len(issues) == 0


"""FastAPI backend main module with deferred initialization.

Adjust import of cleanup_expired_challenges to be resilient when an alternate
auth package (e.g. apps/goblin-assistant/api/auth) shadows the intended
backend/auth module and does not expose the function. We fall back to a stub
to avoid hard startup failure while still cleaning up gracefully when the
real implementation is available.

Version: 1.0.1 - Structured logging enabled
"""


@asynccontextmanager
async def app_lifespan(_: FastAPI):
    await startup_event()
    try:
        yield
    finally:
        await shutdown_event()


app = FastAPI(
    title="GoblinOS Assistant Backend",
    description="Backend API for GoblinOS Assistant with debug capabilities",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=app_lifespan,
)

# Instrument FastAPI app with OpenTelemetry
instrument_fastapi_app(app)

# Configure structured logging
log_level = os.getenv("LOG_LEVEL", "INFO")
logger = setup_logging(log_level)


# Global variables for routing components
challenge_cleanup_task = None
rate_limiter_cleanup_task = None
deferred_initialization_task = None
routing_probe_worker = None


SKIP_RAPTOR_INIT = os.getenv("SKIP_RAPTOR_INIT", "0") == "1"


async def startup_event():
    # Validate configuration first
    await validate_startup_configuration()

    create_tables()

    # Seed the database only if database is properly initialized
    from .database import _db_initialized

    if _db_initialized and SessionLocal is not None:
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    else:
        print("[WARNING] Skipping database seeding - database not properly initialized")
        print("[WARNING] Set DATABASE_URL to a valid PostgreSQL connection string")

    # Always start challenge cleanup early (cheap)
    global challenge_cleanup_task
    challenge_cleanup_task = asyncio.create_task(challenge_cleanup_worker())
    print("Started challenge cleanup background task")

    # Start rate limiter cleanup
    global rate_limiter_cleanup_task
    rate_limiter_cleanup_task = asyncio.create_task(rate_limiter_cleanup_worker())
    print("Started rate limiter cleanup background task")

    # Defer expensive initializations to background task for faster readiness
    global deferred_initialization_task
    deferred_initialization_task = asyncio.create_task(deferred_initialization())


async def deferred_initialization():
    """Run heavier, optional startup tasks without blocking server accept loop."""
    await asyncio.sleep(0)  # yield control
    # Raptor monitoring system (optional)
    if SKIP_RAPTOR_INIT:
        print("Skipping Raptor monitoring init (SKIP_RAPTOR_INIT=1)")
    else:
        try:
            raptor.start()
            print("Started Raptor monitoring system (deferred)")
        except Exception as e:
            print(f"Warning: Deferred Raptor monitoring start failed: {e}")

    # Initialize APScheduler for lightweight periodic tasks
    try:
        from .scheduler import start_scheduler

        start_scheduler()
        print("Started APScheduler for lightweight periodic tasks (deferred)")

        # Kick a one-shot warm-up so the first chat request is less likely to cold-start.
        try:
            from .services.gcp_warmup import warm_gcp_endpoints

            asyncio.create_task(warm_gcp_endpoints(reason="startup"))
        except Exception:
            # Best-effort only; never block startup.
            pass
    except Exception as e:
        print(f"Warning: Deferred APScheduler start failed: {e}")

    # Initialize routing probe worker if encryption key is available (optional)
    # REMOVED: APScheduler with Redis locks now handles all periodic probing
    # to prevent duplicate work across replicas


async def challenge_cleanup_worker():
    """Background worker to clean up expired challenges every 10 minutes"""
    while True:
        try:
            await asyncio.sleep(600)  # Run every 10 minutes
            count = await cleanup_expired_challenges()
            if count > 0:
                print(f"Cleaned up {count} expired challenges")
        except asyncio.CancelledError:
            print("Challenge cleanup worker cancelled")
            break
        except Exception as e:
            print(f"Error in challenge cleanup worker: {e}")


async def rate_limiter_cleanup_worker():
    """Background worker to clean up old rate limiter entries every 5 minutes"""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            limiter.cleanup_old_entries()
            logger.info("Rate limiter cleanup completed")
        except asyncio.CancelledError:
            print("Rate limiter cleanup worker cancelled")
            break
        except Exception as e:
            print(f"Error in rate limiter cleanup worker: {e}")


async def shutdown_event():
    global deferred_initialization_task
    if deferred_initialization_task:
        deferred_initialization_task.cancel()
        try:
            await deferred_initialization_task
        except asyncio.CancelledError:
            pass
        print("Stopped deferred initialization task")

    # Stop APScheduler
    try:
        from .scheduler import stop_scheduler

        stop_scheduler()
        print("Stopped APScheduler")
    except Exception as e:
        print(f"Warning: Failed to stop APScheduler: {e}")

    # Stop Raptor monitoring system
    try:
        raptor.stop()
        print("Stopped Raptor monitoring system")
    except Exception as e:
        print(f"Warning: Failed to stop Raptor monitoring: {e}")

    # Stop routing probe worker (if it exists)
    try:
        global routing_probe_worker
        if routing_probe_worker:
            await routing_probe_worker.stop()
            print("Stopped routing probe worker")
    except (NameError, AttributeError):
        # routing_probe_worker not initialized or doesn't exist
        pass

    # Stop challenge cleanup task
    global challenge_cleanup_task
    if challenge_cleanup_task:
        challenge_cleanup_task.cancel()
        try:
            await challenge_cleanup_task
        except asyncio.CancelledError:
            pass
        print("Stopped challenge cleanup background task")

    # Stop rate limiter cleanup task
    global rate_limiter_cleanup_task
    if rate_limiter_cleanup_task:
        rate_limiter_cleanup_task.cancel()
        try:
            await rate_limiter_cleanup_task
        except asyncio.CancelledError:
            pass
        print("Stopped rate limiter cleanup background task")


# Add request ID middleware (must be before logging middleware)
app.add_middleware(RequestIDMiddleware)

# Add structured logging middleware
app.add_middleware(StructuredLoggingMiddleware)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# CORS middleware for frontend integration
cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,https://goblin-assistant.vercel.app",
)
cors_origins = [
    origin.strip() for origin in cors_origins_str.split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Configure via CORS_ORIGINS env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create versioned API router
v1_router = APIRouter(prefix="/v1")

# Include all routers under v1
v1_router.include_router(debugger_router, tags=["debugger"])
v1_router.include_router(auth_router, tags=["auth"])
v1_router.include_router(jwt_auth_router, tags=["auth"])
v1_router.include_router(search_router, tags=["search"])
v1_router.include_router(settings_router, tags=["settings"])
v1_router.include_router(execute_router, tags=["execute"])
v1_router.include_router(api_keys_router, tags=["api-keys"])
v1_router.include_router(parse_router, tags=["parse"])
v1_router.include_router(routing_router, tags=["routing"])
v1_router.include_router(chat_router, tags=["chat"])
v1_router.include_router(essay_router, tags=["essay"])
v1_router.include_router(api_router, tags=["api"])
v1_router.include_router(stream_router, tags=["stream"])
v1_router.include_router(sandbox_router, tags=["sandbox"])
v1_router.include_router(rag_router, tags=["rag"])
v1_router.include_router(raptor_router, tags=["raptor"])  # Raptor monitoring endpoints
v1_router.include_router(health_router, tags=["health"])  # Health monitoring endpoints
v1_router.include_router(llm_health_router, tags=["health"])  # LLM gateway health
v1_router.include_router(
    dashboard_router, tags=["dashboard"]
)  # Optimized dashboard endpoints
v1_router.include_router(goblins_router, tags=["goblins"])
v1_router.include_router(cost_router, tags=["cost"])
v1_router.include_router(user_auth_router, tags=["auth"])
v1_router.include_router(support_router, tags=["support"])
v1_router.include_router(account_router, tags=["account"])
v1_router.include_router(
    orchestrator_router, tags=["orchestrator"]
)  # Multi-cloud AI orchestration
v1_router.include_router(providers_management_router, tags=["providers"])

# Canonical API surface is versioned under /v1
app.include_router(v1_router)


@app.get("/")
async def root():
    return {"message": "GoblinOS Assistant Backend API"}


@app.get("/health")
async def health():
    # Base health
    result = {"status": "healthy"}

    return result


ollama_router = APIRouter(prefix="/v1/api", tags=["api"])
models_router = APIRouter(prefix="/v1/models", tags=["models"])


class GenerateMessage(BaseModel):
    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str = Field(..., description="Message content")


class GenerateRequest(BaseModel):
    # Backwards compatible with earlier clients: either `prompt` or `messages` may be provided.
    prompt: Optional[str] = Field(None, description="Prompt text (legacy clients)")
    messages: Optional[List[GenerateMessage]] = Field(
        None, description="Structured chat messages"
    )
    model: str = Field("llama2", description="Model hint for upstream providers")
    provider: Optional[str] = Field(
        None, description="Optional provider hint (e.g. ollama_gcp, llamacpp_gcp)"
    )
    max_tokens: Optional[int] = Field(None, ge=1, le=2048)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)


# Opportunistically "wake" self-hosted GCP providers in the background so they don't
# cold-start when they are needed. This must never block a user request.
_GCP_WARM_MIN_INTERVAL_S = float(
    os.getenv("GCP_WARMUP_INTERVAL_S")
    or os.getenv("GCP_WARM_MIN_INTERVAL_S")
    or "300"
)
_gcp_warm_last_at: float = 0.0
_gcp_warm_lock = asyncio.Lock()

# Health + circuit cache for fast failover in /v1/api/generate path.
_PROVIDER_HEALTH_TTL_S = float(os.getenv("GENERATE_PROVIDER_HEALTH_TTL_S", "15"))
_PROVIDER_CIRCUIT_FAILS = int(os.getenv("GENERATE_PROVIDER_CIRCUIT_FAILS", "3"))
_PROVIDER_CIRCUIT_COOLDOWN_S = float(
    os.getenv("GENERATE_PROVIDER_CIRCUIT_COOLDOWN_S", "30")
)
_PROVIDER_AUTH_COOLDOWN_S = float(
    os.getenv("GENERATE_PROVIDER_AUTH_COOLDOWN_S", "600")
)
_provider_health_cache: Dict[str, tuple[float, bool]] = {}
_provider_failure_counts: Dict[str, int] = {}
_provider_circuit_open_until: Dict[str, float] = {}
_provider_auth_blocked_until: Dict[str, float] = {}


def _is_simple_prompt(messages: List[Dict[str, str]]) -> bool:
    user_messages = [m for m in messages if m.get("role") == "user"]
    if len(user_messages) != 1:
        return False
    text = (user_messages[0].get("content") or "").strip()
    return bool(text) and len(text) <= 32


def _is_provider_blocked(provider_name: str) -> bool:
    return _provider_circuit_open_until.get(provider_name, 0.0) > time.time()


def _is_provider_auth_blocked(provider_name: str) -> bool:
    return _provider_auth_blocked_until.get(provider_name, 0.0) > time.time()


def _provider_recently_unhealthy(provider_name: str) -> bool:
    cached = _provider_health_cache.get(provider_name)
    if not cached:
        return False
    ts, healthy = cached
    if (time.time() - ts) > _PROVIDER_HEALTH_TTL_S:
        return False
    return not healthy


def _mark_provider_success(provider_name: str) -> None:
    _provider_health_cache[provider_name] = (time.time(), True)
    _provider_failure_counts[provider_name] = 0
    _provider_circuit_open_until.pop(provider_name, None)
    _provider_auth_blocked_until.pop(provider_name, None)


def _mark_provider_failure(provider_name: str, retryable: bool = False) -> None:
    _provider_health_cache[provider_name] = (time.time(), False)
    if not retryable:
        return
    failures = _provider_failure_counts.get(provider_name, 0) + 1
    _provider_failure_counts[provider_name] = failures
    if failures >= _PROVIDER_CIRCUIT_FAILS:
        _provider_circuit_open_until[provider_name] = (
            time.time() + _PROVIDER_CIRCUIT_COOLDOWN_S
        )


def _mark_provider_auth_failure(provider_name: str) -> None:
    _provider_health_cache[provider_name] = (time.time(), False)
    _provider_auth_blocked_until[provider_name] = (
        time.time() + _PROVIDER_AUTH_COOLDOWN_S
    )


def _is_retryable_error(exc: Exception) -> bool:
    import httpx

    return isinstance(
        exc, (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.ConnectError)
    )


async def _warm_gcp_providers_once() -> None:
    # Centralized warm-up: keepalive + optional tiny inference.
    from .services.gcp_warmup import warm_gcp_endpoints

    await warm_gcp_endpoints(reason="request-path")


async def _maybe_warm_gcp_providers() -> None:
    global _gcp_warm_last_at

    now = time.time()
    if (now - _gcp_warm_last_at) < _GCP_WARM_MIN_INTERVAL_S:
        return

    async with _gcp_warm_lock:
        now = time.time()
        if (now - _gcp_warm_last_at) < _GCP_WARM_MIN_INTERVAL_S:
            return
        _gcp_warm_last_at = now

    try:
        await _warm_gcp_providers_once()
    except Exception as e:
        logger.debug("GCP warm-up failed", extra={"error": type(e).__name__})


async def _generate_completion(
    request: GenerateRequest,
    forced_provider: Optional[str] = None,
    forced_model: Optional[str] = None,
    correlation_id: Optional[str] = None,
    response: Optional[Response] = None,
):
    """Generate completion with robust provider fallback and fast-path routing."""
    import httpx

    correlation_id = correlation_id or str(uuid.uuid4())
    if response is not None:
        response.headers["X-Correlation-ID"] = correlation_id
    asyncio.create_task(_maybe_warm_gcp_providers())

    system_prompt = (
        os.getenv("GOBLIN_SYSTEM_PROMPT")
        or "You are Goblin Assistant. Respond as the assistant only. Do not include role labels like 'User:' or 'Assistant:'. "
        "Do not claim you performed real-world actions (sending emails/messages, payments, etc.). "
        "If asked to send a message/email, say you cannot send it directly and offer to draft it, asking for the needed details. "
        "Be concise unless the user asks for more detail."
    )

    if request.messages and len(request.messages) > 0:
        messages: List[Dict[str, str]] = [
            {"role": m.role, "content": m.content} for m in request.messages
        ]
    else:
        prompt_text = (request.prompt or "").strip()
        if not prompt_text:
            raise HTTPException(
                status_code=400, detail='Missing "prompt" or "messages"'
            )
        messages = [{"role": "user", "content": prompt_text}]

    if not any(m.get("role") == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": system_prompt})

    last_user = next(
        (m.get("content", "") for m in reversed(messages) if m.get("role") == "user"),
        "",
    )

    def _default_max_tokens(text: str) -> int:
        n = len((text or "").strip())
        if n <= 32:
            return 64
        if n <= 200:
            return 128
        return 256

    req_max_tokens = int(request.max_tokens) if request.max_tokens else _default_max_tokens(last_user)
    req_max_tokens = max(1, min(req_max_tokens, 1024))
    req_temperature = float(request.temperature) if request.temperature is not None else 0.2
    req_temperature = max(0.0, min(req_temperature, 2.0))
    prompt = last_user or (request.prompt or "")
    model = (forced_model or request.model or "llama2").strip()
    provider_hint = (forced_provider or request.provider or "").strip()

    simple_prompt = _is_simple_prompt(messages)
    hard_timeout_s = 20.0 if forced_provider else (6.0 if simple_prompt else 20.0)
    request_deadline = time.time() + hard_timeout_s
    errors: List[str] = []

    def _safe_err(provider: str, exc: Exception) -> str:
        try:
            if isinstance(exc, httpx.HTTPStatusError):
                return f"{provider}: HTTP {exc.response.status_code}"
            if isinstance(exc, (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout)):
                return f"{provider}: timeout"
            if isinstance(exc, httpx.ConnectError):
                return f"{provider}: connect_error"
            return f"{provider}: {type(exc).__name__}"
        except Exception:
            return f"{provider}: {type(exc).__name__}"

    def _remaining_timeout(default_total: float, default_connect: float = 2.0) -> httpx.Timeout:
        remaining = max(0.2, request_deadline - time.time())
        return httpx.Timeout(min(default_total, remaining), connect=min(default_connect, remaining))

    def _is_auth_error(exc: Exception) -> bool:
        return (
            isinstance(exc, httpx.HTTPStatusError)
            and exc.response is not None
            and exc.response.status_code in {401, 403}
        )

    def _provider_allowed(name: str) -> bool:
        if provider_hint and provider_hint != name:
            return False
        if forced_provider and name == forced_provider:
            return True
        if _is_provider_auth_blocked(name):
            return False
        if _is_provider_blocked(name):
            return False
        if _provider_recently_unhealthy(name):
            return False
        return True

    provider_timeout_profiles: Dict[str, tuple[float, float]]
    if simple_prompt:
        provider_timeout_profiles = {
            "siliconeflow": (2.0, 0.8),
            "ollama_gcp": (2.2, 0.8),
            "llamacpp_gcp": (2.2, 0.8),
            "gemini": (1.0, 0.8),
            "deepseek": (1.0, 0.8),
            "openrouter": (1.0, 0.8),
            "openai": (1.0, 0.8),
            "anthropic": (1.0, 0.8),
            "groq": (1.0, 0.8),
            "goblin-chat": (0.8, 0.5),
        }
        provider_order = [
            "siliconeflow",
            "ollama_gcp",
            "llamacpp_gcp",
            "gemini",
            "deepseek",
            "openrouter",
            "openai",
            "anthropic",
            "groq",
            "goblin-chat",
        ]
    else:
        provider_timeout_profiles = {
            "goblin-chat": (8.0, 1.0),
            "ollama_gcp": (8.0, 1.0),
            "llamacpp_gcp": (8.0, 1.0),
            "siliconeflow": (6.0, 1.0),
            "gemini": (6.0, 1.0),
            "deepseek": (6.0, 1.0),
            "openrouter": (6.0, 1.0),
            "openai": (6.0, 1.0),
            "anthropic": (6.0, 1.0),
            "groq": (6.0, 1.0),
        }
        provider_order = [
            "goblin-chat",
            "ollama_gcp",
            "llamacpp_gcp",
            "siliconeflow",
            "gemini",
            "deepseek",
            "openrouter",
            "openai",
            "anthropic",
            "groq",
        ]

    if forced_provider:
        provider_order = [forced_provider]

    provider_labels = {
        "goblin-chat": "goblin-chat",
        "ollama_gcp": "Ollama/GCP",
        "llamacpp_gcp": "LlamaCpp/GCP",
        "gemini": "Gemini",
        "groq": "Groq",
        "deepseek": "DeepSeek",
        "siliconeflow": "SiliconeFlow",
        "openrouter": "OpenRouter",
        "openai": "OpenAI",
        "anthropic": "Anthropic",
    }

    def _provider_timeout(name: str) -> httpx.Timeout:
        if forced_provider and name == forced_provider:
            return _remaining_timeout(15.0, default_connect=1.5)
        total, connect = provider_timeout_profiles.get(name, (6.0, 1.0))
        return _remaining_timeout(total, default_connect=connect)

    async def _attempt_provider(
        provider_name: str,
        provider_call: Callable[[], Awaitable[Dict[str, Any]]],
        max_attempts: int = 1,
    ) -> Optional[Dict[str, Any]]:
        if not _provider_allowed(provider_name):
            return None

        def _normalize_usage(raw: Any) -> Dict[str, int]:
            if not isinstance(raw, dict):
                return {}

            def _to_int(value: Any) -> int:
                try:
                    n = int(value)
                    return max(0, n)
                except Exception:
                    return 0

            input_tokens = _to_int(
                raw.get("input_tokens")
                or raw.get("prompt_tokens")
                or raw.get("prompt_eval_count")
                or raw.get("promptTokenCount")
            )
            output_tokens = _to_int(
                raw.get("output_tokens")
                or raw.get("completion_tokens")
                or raw.get("eval_count")
                or raw.get("candidatesTokenCount")
            )
            total_tokens = _to_int(raw.get("total_tokens") or raw.get("totalTokenCount"))
            if not total_tokens:
                total_tokens = input_tokens + output_tokens
            return {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens,
            }

        def _get_usd_per_1k(provider_id: str) -> tuple[float, float]:
            # Self-hosted inference is treated as "free" in the UI.
            if provider_id in {"ollama_gcp", "llamacpp_gcp", "goblin-chat"}:
                return (0.0, 0.0)

            try:
                # Prefer the centralized ProviderConfig costs if available.
                from .providers.provider_registry import get_provider_registry as _get_cost_registry

                cfg = _get_cost_registry().get_provider(provider_id)
                if cfg is not None:
                    return (float(cfg.cost_per_token_input or 0.0), float(cfg.cost_per_token_output or 0.0))
            except Exception:
                pass

            # Fallback: conservative defaults (USD per 1k tokens).
            fallback: Dict[str, tuple[float, float]] = {
                "openai": (0.002, 0.006),
                "anthropic": (0.008, 0.024),
                "openrouter": (0.003, 0.009),
                "groq": (0.0002, 0.0002),
                "deepseek": (0.0002, 0.0004),
                "gemini": (0.0005, 0.001),
                "siliconeflow": (0.001, 0.002),
            }
            return fallback.get(provider_id, (0.02, 0.02))

        def _compute_cost_usd(usage: Dict[str, int], provider_id: str) -> float:
            try:
                rates = _get_usd_per_1k(provider_id)
                input_rate, output_rate = rates
                it = int(usage.get("input_tokens") or 0)
                ot = int(usage.get("output_tokens") or 0)
                if not it and not ot:
                    total = int(usage.get("total_tokens") or 0)
                    it = int(total * 0.4)
                    ot = max(0, total - it)
                cost = (it / 1000.0) * float(input_rate) + (ot / 1000.0) * float(output_rate)
                return float(round(cost, 6))
            except Exception:
                return 0.0

        for attempt in range(max_attempts):
            try:
                result = await provider_call()
                _mark_provider_success(provider_name)
                if isinstance(result, dict):
                    # Normalize response fields for frontend visibility.
                    if "content" not in result and "response" in result:
                        result["content"] = result.get("response") or ""
                    result.setdefault("provider", provider_name)
                    result["correlation_id"] = correlation_id

                    normalized_usage = _normalize_usage(result.get("usage", {}))
                    if normalized_usage:
                        result["usage"] = normalized_usage
                    else:
                        result.pop("usage", None)

                    # Compute cost if not already provided by upstream.
                    if "cost_usd" not in result or result.get("cost_usd") is None:
                        if normalized_usage:
                            result["cost_usd"] = _compute_cost_usd(normalized_usage, str(result.get("provider") or provider_name))
                return result
            except Exception as e:
                auth_error = _is_auth_error(e)
                if auth_error:
                    _mark_provider_auth_failure(provider_name)
                retryable = _is_retryable_error(e) and not auth_error
                _mark_provider_failure(provider_name, retryable=retryable)
                errors.append(_safe_err(provider_labels.get(provider_name, provider_name), e))
                if retryable and attempt < (max_attempts - 1):
                    continue
                return None
        return None

    goblin_chat_url_env = (os.getenv("GOBLIN_CHAT_URL") or "").strip()
    goblin_chat_urls = (
        [goblin_chat_url_env]
        if goblin_chat_url_env
        else ["http://goblin-chat.internal:8080", "https://goblin-chat.fly.dev"]
    )
    goblin_chat_key = os.getenv("GOBLIN_CHAT_API_KEY") or os.getenv("GOBLIN_API_KEY") or ""
    ollama_url = (os.getenv("OLLAMA_GCP_URL") or os.getenv("OLLAMA_BASE_URL") or "").strip()
    llamacpp_url = (os.getenv("LLAMACPP_GCP_URL") or "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROK_API_KEY") or os.getenv("GROQ_API_KEY")
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    siliconeflow_key = (os.getenv("SILICONEFLOW_API_KEY") or "").strip()
    openrouter_key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
    openrouter_url = (
        os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1"
    ).strip().rstrip("/")
    openrouter_default_model = (
        os.getenv("OPENROUTER_DEFAULT_MODEL") or "openrouter/auto"
    ).strip()
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    async def _call_siliconeflow() -> Dict[str, Any]:
        siliconeflow_url = (
            os.getenv("SILICONEFLOW_BASE_URL") or "https://api.siliconflow.com/v1"
        ).strip().rstrip("/")
        siliconeflow_model = (
            model
            if provider_hint == "siliconeflow"
            else (
                os.getenv("SILICONEFLOW_DEFAULT_MODEL")
                or "Qwen/Qwen2.5-7B-Instruct"
            ).strip()
        )
        async with httpx.AsyncClient(timeout=_provider_timeout("siliconeflow")) as client:
            provider_response = await client.post(
                f"{siliconeflow_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {siliconeflow_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": siliconeflow_model,
                    "messages": messages,
                    "max_tokens": req_max_tokens,
                    "temperature": req_temperature,
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

    async def _call_ollama_gcp() -> Dict[str, Any]:
        adapter = OllamaAdapter(
            api_key=os.getenv("LOCAL_LLM_API_KEY"),
            base_url=ollama_url,
        )
        ollama_model = model
        if not forced_model and (not request.model or model == "llama2"):
            ollama_model = (os.getenv("OLLAMA_GCP_DEFAULT_MODEL") or "gemma:2b").strip()
        max_adapter_timeout = 15 if forced_provider else 8
        adapter.timeout = int(max(1, min(max_adapter_timeout, request_deadline - time.time())))
        result = await adapter.generate(
            messages,
            model=ollama_model,
            max_tokens=req_max_tokens,
            temperature=req_temperature,
        )
        if isinstance(result, dict) and "content" in result and "response" not in result:
            result["response"] = result.get("content") or ""
        if isinstance(result, dict):
            result.setdefault("provider", "ollama_gcp")
            result.setdefault("model", ollama_model)
        return result

    async def _call_llamacpp_gcp() -> Dict[str, Any]:
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        local_key = (os.getenv("LOCAL_LLM_API_KEY") or "").strip()
        if local_key:
            headers["x-api-key"] = local_key
        llamacpp_model = model
        if not forced_model and (not request.model or model == "llama2"):
            llamacpp_model = (
                os.getenv("LLAMACPP_GCP_DEFAULT_MODEL") or "phi-3-mini-4k-instruct-q4"
            ).strip()
        async with httpx.AsyncClient(timeout=_provider_timeout("llamacpp_gcp")) as client:
            payload = {
                "model": llamacpp_model,
                "messages": messages,
                "max_tokens": req_max_tokens,
                "temperature": req_temperature,
            }
            data: Dict[str, Any] = {}
            content = ""
            for path in ("/chat/completions", "/v1/chat/completions"):
                provider_response = await client.post(
                    f"{llamacpp_url.rstrip('/')}{path}",
                    headers=headers,
                    json=payload,
                )
                if provider_response.status_code in {404, 405}:
                    continue
                provider_response.raise_for_status()
                data = provider_response.json()
                content = (
                    ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
                    or data.get("content")
                    or data.get("response")
                    or ""
                )
                if content:
                    break

            if not content:
                completion_response = await client.post(
                    f"{llamacpp_url.rstrip('/')}/completion",
                    headers=headers,
                    json={
                        "prompt": prompt,
                        "n_predict": req_max_tokens,
                        "temperature": req_temperature,
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
                "finish_reason": ((data.get("choices") or [{}])[0]).get("finish_reason", "stop"),
            }

    async def _call_gemini() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=_provider_timeout("gemini")) as client:
            provider_response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": req_max_tokens},
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

    async def _call_deepseek() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=_provider_timeout("deepseek")) as client:
            provider_response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {deepseek_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "max_tokens": req_max_tokens,
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

    async def _call_openrouter() -> Dict[str, Any]:
        openrouter_model = model
        if not forced_model and (not request.model or model == "llama2"):
            openrouter_model = openrouter_default_model

        async with httpx.AsyncClient(timeout=_provider_timeout("openrouter")) as client:
            provider_response = await client.post(
                f"{openrouter_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": openrouter_model,
                    "messages": messages,
                    "max_tokens": req_max_tokens,
                    "temperature": req_temperature,
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

    async def _call_openai() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=_provider_timeout("openai")) as client:
            provider_response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "max_tokens": req_max_tokens,
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

    async def _call_anthropic() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=_provider_timeout("anthropic")) as client:
            provider_response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": req_max_tokens,
                    "messages": messages,
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

    async def _call_groq() -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=_provider_timeout("groq")) as client:
            provider_response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": messages,
                    "max_tokens": req_max_tokens,
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

    async def _call_goblin_chat() -> Dict[str, Any]:
        for goblin_chat_url in goblin_chat_urls:
            goblin_chat_url = (goblin_chat_url or "").rstrip("/")
            if not goblin_chat_url:
                continue
            headers = {"Content-Type": "application/json"}
            if goblin_chat_key:
                headers["Authorization"] = f"Bearer {goblin_chat_key}"
            async with httpx.AsyncClient(timeout=_provider_timeout("goblin-chat")) as client:
                provider_response = await client.post(
                    f"{goblin_chat_url}/v1/chat/completions",
                    headers=headers,
                    json={
                        "messages": messages,
                        "max_tokens": req_max_tokens,
                        "temperature": req_temperature,
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

    provider_attempts: Dict[str, Callable[[], Awaitable[Dict[str, Any]]]] = {
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

    for provider_name in provider_order:
        if provider_name not in provider_attempts:
            continue
        if provider_name == "siliconeflow" and not siliconeflow_key:
            continue
        if provider_name == "ollama_gcp" and not ollama_url:
            continue
        if provider_name == "llamacpp_gcp" and not llamacpp_url:
            continue
        if provider_name == "gemini" and not gemini_key:
            continue
        if provider_name == "deepseek" and (
            not deepseek_key or deepseek_key == "placeholder"
        ):
            continue
        if provider_name == "openrouter" and (
            not openrouter_key or openrouter_key == "placeholder"
        ):
            continue
        if provider_name == "openai" and (not openai_key or openai_key == "placeholder"):
            continue
        if provider_name == "anthropic" and (
            not anthropic_key or anthropic_key == "placeholder"
        ):
            continue
        if provider_name == "groq" and (not groq_key or groq_key == "placeholder"):
            continue

        max_attempts = 1
        if provider_name in {"ollama_gcp", "llamacpp_gcp"} and not simple_prompt and not forced_provider:
            max_attempts = 2

        result = await _attempt_provider(
            provider_name=provider_name,
            provider_call=provider_attempts[provider_name],
            max_attempts=max_attempts,
        )
        if result is not None:
            return result

    if forced_provider:
        logger.error(
            "Forced provider request failed",
            extra={"correlation_id": correlation_id, "provider": forced_provider, "errors": errors},
        )
        raise_problem(
            status=503,
            title="Service Unavailable",
            detail="Selected inference provider unavailable.",
            type_uri="https://goblin-backend.fly.dev/errors/service-unavailable",
            code=ErrorCodes.SERVICE_UNAVAILABLE,
            instance=correlation_id,
            headers={"X-Correlation-ID": correlation_id},
        )

    logger.error(
        "All providers failed",
        extra={"correlation_id": correlation_id, "provider_errors": errors},
    )
    raise_problem(
        status=503,
        title="Service Unavailable",
        detail="All inference providers unavailable.",
        type_uri="https://goblin-backend.fly.dev/errors/service-unavailable",
        code=ErrorCodes.SERVICE_UNAVAILABLE,
        instance=correlation_id,
        headers={"X-Correlation-ID": correlation_id},
    )


@ollama_router.post("/generate")
async def ollama_generate(request: GenerateRequest, req: Request, response: Response):
    return await _generate_completion(
        request=request,
        correlation_id=getattr(req.state, "request_id", None),
        response=response,
    )


@models_router.get("/routes")
async def list_model_routes():
    catalog = get_provider_registry().get_provider_catalog()
    routes: List[Dict[str, Any]] = []
    for provider_id, item in sorted(catalog.items()):
        models = item.get("models") or []
        if not isinstance(models, list):
            continue
        for model_name in models:
            if not isinstance(model_name, str) or not model_name:
                continue
            routes.append(
                {
                    "provider": provider_id,
                    "model": model_name,
                    "endpoint": f"/v1/models/{provider_id}/{quote(model_name, safe='')}/chat",
                }
            )
    return {"routes": routes, "count": len(routes)}


@models_router.post("/{provider}/{model}/chat")
async def chat_for_model(
    provider: str,
    model: str,
    request: GenerateRequest,
    req: Request,
    response: Response,
):
    provider_id = provider.strip()
    decoded_model = unquote(model).strip()
    catalog = get_provider_registry().get_provider_catalog()
    provider_meta = catalog.get(provider_id) or catalog.get(provider)
    if not provider_meta:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    configured_models = provider_meta.get("models") or []
    if decoded_model not in configured_models:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{decoded_model}' not configured for provider '{provider_id}'",
        )
    return await _generate_completion(
        request=request,
        forced_provider=provider_id,
        forced_model=decoded_model,
        correlation_id=getattr(req.state, "request_id", None),
        response=response,
    )


app.include_router(ollama_router)
app.include_router(models_router)
