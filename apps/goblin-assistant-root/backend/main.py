import os
import asyncio
from contextlib import asynccontextmanager
from typing import Any, List
from urllib.parse import quote
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

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
from .middleware.licensing_middleware import LicenseEnforcementMiddleware, FeatureAccessMiddleware

# Import routers
from .debugger.router import router as debugger_router
from .routers.generate_router import ollama_router, models_router
from .services import generate_service as _generate_service
from .providers.registry import get_provider_registry
from .errors import ErrorCodes
from .providers.ollama_adapter import OllamaAdapter

try:  # Import cleanup function from the actual auth router module
    from .auth.auth_router import cleanup_expired_challenges  # type: ignore
except Exception:  # noqa: BLE001

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
from .routers.chat_info_router import router as chat_info_router
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

        if settings.is_production and settings.allow_memory_fallback and settings.is_multi_instance:
            issues.append("Memory fallback not allowed in multi-instance production")

        if settings.is_production and not os.getenv("ROUTING_ENCRYPTION_KEY"):
            issues.append("ROUTING_ENCRYPTION_KEY required in production for chat routing")

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
            issues.append("Redis required but not available in multi-instance production")
    except ImportError:
        print("⚠️  Dependency checker not available - skipping automated checks")
    except Exception as e:
        issues.append(f"Dependency validation failed: {e}")

    # Report issues
    if issues:
        print("❌ Startup validation failed:")
        for issue in issues:
            print(f"  - {issue}")
        print("\n🚨 Critical configuration issues detected. Server may not function properly.")
        print("   Check the issues above and fix before proceeding to production.")
        # Don't exit - allow server to start with warnings for development
        if settings is not None and settings.is_production:
            print("   In production environment, these issues should be resolved immediately.")
    else:
        print("✅ Startup validation passed - all systems ready")

    return len(issues) == 0


"""FastAPI backend main module with deferred initialization.

Adjust import of cleanup_expired_challenges to be resilient when an alternate
auth package (e.g. apps/goblin-assistant-root/api/auth) shadows the intended
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

# Add license enforcement middleware (before rate limiting)
app.add_middleware(LicenseEnforcementMiddleware)

# Add feature access middleware
app.add_middleware(FeatureAccessMiddleware)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# CORS middleware for frontend integration
cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,https://goblin-assistant.vercel.app",
)
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
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
v1_router.include_router(jwt_auth_router, tags=["auth"])
v1_router.include_router(search_router, tags=["search"])
v1_router.include_router(settings_router, tags=["settings"])
v1_router.include_router(execute_router, tags=["execute"])
v1_router.include_router(api_keys_router, tags=["api-keys"])
v1_router.include_router(parse_router, tags=["parse"])
v1_router.include_router(routing_router, tags=["routing"])
v1_router.include_router(chat_router, tags=["chat"])
v1_router.include_router(chat_info_router, tags=["chat"])
v1_router.include_router(essay_router, tags=["essay"])
v1_router.include_router(api_router, tags=["api"])
v1_router.include_router(stream_router, tags=["stream"])
v1_router.include_router(sandbox_router, tags=["sandbox"])
v1_router.include_router(rag_router, tags=["rag"])
v1_router.include_router(raptor_router, tags=["raptor"])  # Raptor monitoring endpoints
v1_router.include_router(health_router, tags=["health"])  # Health monitoring endpoints
v1_router.include_router(llm_health_router, tags=["health"])  # LLM gateway health
v1_router.include_router(dashboard_router, tags=["dashboard"])  # Optimized dashboard endpoints
v1_router.include_router(goblins_router, tags=["goblins"])
v1_router.include_router(cost_router, tags=["cost"])
v1_router.include_router(user_auth_router, tags=["auth"])
v1_router.include_router(support_router, tags=["support"])
v1_router.include_router(account_router, tags=["account"])
v1_router.include_router(orchestrator_router, tags=["orchestrator"])  # Multi-cloud AI orchestration
v1_router.include_router(providers_management_router, tags=["providers"])

# Canonical API surface is versioned under /v1
app.include_router(v1_router)

# Optional legacy routes for tests/backwards compatibility
if os.getenv("ENABLE_LEGACY_ROUTES", "0") == "1":
    app.include_router(jwt_auth_router)
    app.include_router(api_keys_router)


@app.get("/")
async def root():
    return {"message": "GoblinOS Assistant Backend API"}


@app.get("/health")
async def health():
    # Base health
    result = {"status": "healthy"}

    return result


# Generate and model routing endpoints
app.include_router(ollama_router)
app.include_router(models_router)

# ---------------------------------------------------------------------------
# Backwards-compatible exports for tests (generate recovery + model routes)
# ---------------------------------------------------------------------------

GenerateRequest = _generate_service.GenerateRequest
_generate_completion = _generate_service.generate_completion
_provider_health_cache = _generate_service._provider_health_cache
_provider_failure_counts = _generate_service._provider_failure_counts
_provider_circuit_open_until = _generate_service._provider_circuit_open_until
_provider_auth_blocked_until = _generate_service._provider_auth_blocked_until
_maybe_warm_gcp_providers = _generate_service._maybe_warm_gcp_providers


async def list_model_routes() -> dict[str, Any]:
    catalog = get_provider_registry().get_provider_catalog()
    routes: list[dict[str, Any]] = []
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
