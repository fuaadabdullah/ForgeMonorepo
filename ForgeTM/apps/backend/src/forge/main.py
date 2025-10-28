from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openfeature import api

from .api.analytics import router as analytics_router
from .api.auth import router as auth_router
from .api.litellm import router as litellm_router

# from openfeature.contrib.provider.flagd import FlagdProvider  # Temporarily disabled
from .api.ollama import router as ollama_router
from .api.providers import router as providers_router
from .api.rag import router as rag_router
from .config import settings
from .database import create_tables
from .observability.sentry import init_sentry
from .observability.tracing import init_tracing


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup - create tables synchronously
    create_tables()
    yield
    # Shutdown
    pass


app = FastAPI(title='ForgeTM Backend', version=settings.version, lifespan=lifespan)


# Initialize Sentry error tracking (must be first)
init_sentry()

# Initialize OpenTelemetry tracing if enabled
if settings.enable_tracing:
    init_tracing(app, settings.otel_service_name, settings.otel_service_version)

# Initialize OpenFeature
# Use Flagd as the feature flag provider (can be replaced with other providers)
# api.set_provider(FlagdProvider(host="flagd", port=8013))  # Temporarily disabled

# CORS: allow localhost by default for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
async def health() -> dict[str, float | str | int]:
    """Basic health endpoint."""
    import time

    uptime = time.time() - settings.app_started_at
    return {
        'status': 'ok',
        'version': settings.version,
        'uptime_sec': round(uptime, 3),
    }


# Routers
app.include_router(auth_router, prefix='/auth', tags=['auth'])
app.include_router(providers_router, prefix='/providers', tags=['providers'])
app.include_router(ollama_router, prefix='/ollama', tags=['ollama'])
app.include_router(litellm_router, prefix='/v1', tags=['litellm'])
app.include_router(analytics_router, prefix='/v1', tags=['analytics'])
app.include_router(rag_router, prefix='/rag', tags=['rag'])
