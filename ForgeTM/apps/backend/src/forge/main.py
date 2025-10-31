import os
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.analytics import router as analytics_router
from .api.auth import router as auth_router
from .api.feature_flags import router as feature_flags_router
from .api.jobs import router as jobs_router
from .api.litellm import router as litellm_router
from .api.ollama import router as ollama_router
from .api.providers import router as providers_router
from .api.rag import router as rag_router
from .api.router_audit import router as router_audit_router
from .api.notifications import router as notifications_router
from .api.overmind import router as overmind_router
from .config import settings
from .database import create_tables
from .observability.sentry import init_sentry
from .observability.tracing import init_tracing


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager."""
    # Startup - create tables synchronously
    create_tables()
    yield
    # Shutdown
    pass


app = FastAPI(title='ForgeTM Backend', version=settings.version, lifespan=lifespan)


# CORS: allow localhost by default for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# Initialize Sentry error tracking (must be first)
init_sentry()

# Initialize OpenTelemetry tracing if enabled
print(f'DEBUG: enable_tracing = {settings.enable_tracing}')
if settings.enable_tracing:
    init_tracing(app, settings.otel_service_name, settings.otel_service_version)

# CORS: allow localhost by default for local dev
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=['*'],
#     allow_credentials=True,
#     allow_methods=['*'],
#     allow_headers=['*'],
# )  # Temporarily disabled for testing


@app.get('/health')
async def health() -> dict[str, float | str | int]:
    """Basic health endpoint."""
    import time

    uptime = time.time() - settings.app_started_at
    return {
        'status': 'ok',
        'version': settings.version,
        'uptime_sec': round(uptime, 3),
        'testing_mode': os.getenv('TESTING', 'false'),
        'settings_testing': settings.testing,
    }


# Routers
app.include_router(auth_router, prefix='/auth', tags=['auth'])
app.include_router(feature_flags_router, prefix='/api', tags=['feature-flags'])
app.include_router(providers_router, prefix='/providers', tags=['providers'])
app.include_router(ollama_router, prefix='/ollama', tags=['ollama'])
app.include_router(litellm_router, prefix='/v1', tags=['litellm'])
app.include_router(analytics_router, prefix='/v1', tags=['analytics'])
app.include_router(jobs_router, prefix='/api', tags=['jobs'])
app.include_router(rag_router, prefix='/rag', tags=['rag'])
app.include_router(router_audit_router, prefix='/v1', tags=['router-audit'])
app.include_router(notifications_router, prefix='/api', tags=['notifications'])
app.include_router(overmind_router, prefix='/api/v1', tags=['overmind'])
