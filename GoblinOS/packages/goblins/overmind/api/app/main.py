"""
🚀 Overmind FastAPI Backend

Production-ready REST API for the Overmind orchestrator.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import logging

from app.config import settings
from app.api.v1.router import api_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    "overmind_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "overmind_request_duration_seconds", "HTTP request latency", ["method", "endpoint"]
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Application state
app_state = {"start_time": time.time()}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🧙‍♂️ Overmind API starting up...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"CORS origins: {settings.cors_origins}")
    logger.info(f"Rate limit: {settings.rate_limit_per_minute} req/min")

    yield

    logger.info("Overmind API shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Overmind API",
    description="🧙‍♂️ Chief Goblin Agent Orchestrator API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware for metrics and logging
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Track request metrics"""
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time
    endpoint = request.url.path
    method = request.method
    status = response.status_code

    # Record metrics
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)

    # Log request
    logger.info(
        f"{method} {endpoint} {status} {duration:.3f}s",
        extra={
            "method": method,
            "endpoint": endpoint,
            "status": status,
            "duration": duration,
        },
    )

    return response


# Health check endpoint
@app.get("/health", tags=["system"])
async def health_check():
    """
    Comprehensive health check endpoint

    Validates:
    - API service is running
    - Node.js bridge is accessible
    - Critical environment variables are set
    """
    uptime = int(time.time() - app_state["start_time"])

    # Check Node.js bridge
    node_bridge_status = "unknown"
    node_bridge_error = None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.node_bridge_url}/health")
            if response.status_code == 200:
                node_bridge_status = "healthy"
            else:
                node_bridge_status = "degraded"
                node_bridge_error = f"HTTP {response.status_code}"
    except Exception as e:
        node_bridge_status = "unhealthy"
        node_bridge_error = str(e)

    # Check critical environment variables
    env_checks = {
        "node_bridge_url": settings.node_bridge_url is not None,
        "cors_configured": len(settings.cors_origins) > 0,
    }

    # Overall status
    overall_status = "healthy"
    if node_bridge_status != "healthy":
        overall_status = "degraded"
    if not all(env_checks.values()):
        overall_status = "unhealthy"

    return {
        "status": overall_status,
        "version": "0.1.0",
        "uptime": uptime,
        "environment": settings.environment,
        "checks": {
            "api": "healthy",
            "node_bridge": {
                "status": node_bridge_status,
                "url": settings.node_bridge_url,
                "error": node_bridge_error,
            },
            "environment": env_checks,
        },
    }


# Metrics endpoint
@app.get("/metrics", tags=["system"])
async def metrics():
    """Prometheus metrics endpoint"""
    from fastapi.responses import Response

    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Root endpoint
@app.get("/", tags=["system"])
async def root():
    """API root"""
    return {
        "name": "Overmind API",
        "version": "0.1.0",
        "description": "🧙‍♂️ Chief Goblin Agent Orchestrator",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


# Include API router
app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
