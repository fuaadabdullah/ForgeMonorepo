import time
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends

from ..api.auth import get_current_active_user
from ..config import settings
from ..models.user import User
from ..observability.sentry import add_breadcrumb, capture_exception
from ..observability.tracing import get_tracer

router = APIRouter()
tracer = get_tracer(__name__)


async def _check_ollama() -> dict[str, Any]:
    with tracer.start_as_current_span('check_ollama') as span:
        start = time.perf_counter()
        base_url = settings.ollama_base_url or 'http://localhost:11434'
        url = base_url.rstrip('/') + '/api/tags'
        span.set_attribute('provider.name', 'ollama')
        span.set_attribute('provider.url', url)
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(url)
            ok = r.status_code == 200
            latency_ms = int((time.perf_counter() - start) * 1000)
            span.set_attribute('provider.status', 'ok' if ok else 'error')
            span.set_attribute('provider.latency_ms', latency_ms)
            return {
                'name': 'ollama',
                'ok': ok,
                'latency_ms': latency_ms,
                'url': settings.ollama_base_url,
            }
        except Exception as e:
            latency_ms = int((time.perf_counter() - start) * 1000)
            span.set_attribute('provider.status', 'error')
            span.set_attribute('provider.latency_ms', latency_ms)
            span.set_attribute('error.message', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(e, provider='ollama', url=url, latency_ms=latency_ms)
            add_breadcrumb(
                f'Ollama health check failed: {str(e)}',
                category='health_check',
                level='warning',
                provider='ollama',
                latency_ms=latency_ms,
            )
            return {
                'name': 'ollama',
                'ok': False,
                'latency_ms': latency_ms,
                'error': str(e),
                'url': settings.ollama_base_url,
            }


async def _check_litellm() -> dict[str, Any]:
    with tracer.start_as_current_span('check_litellm') as span:
        start = time.perf_counter()
        # OpenAI-compatible list models endpoint is a lightweight health proxy
        base_url = settings.litellm_proxy_url or 'http://localhost:4000'
        url = base_url.rstrip('/') + '/v1/models'
        span.set_attribute('provider.name', 'litellm')
        span.set_attribute('provider.url', url)
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(url)
            ok = r.status_code == 200
            latency_ms = int((time.perf_counter() - start) * 1000)
            span.set_attribute('provider.status', 'ok' if ok else 'error')
            span.set_attribute('provider.latency_ms', latency_ms)
            return {
                'name': 'litellm',
                'ok': ok,
                'latency_ms': latency_ms,
                'url': settings.litellm_proxy_url,
            }
        except Exception as e:
            latency_ms = int((time.perf_counter() - start) * 1000)
            span.set_attribute('provider.status', 'error')
            span.set_attribute('provider.latency_ms', latency_ms)
            span.set_attribute('error.message', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(e, provider='litellm', url=url, latency_ms=latency_ms)
            add_breadcrumb(
                f'LiteLLM health check failed: {str(e)}',
                category='health_check',
                level='warning',
                provider='litellm',
                latency_ms=latency_ms,
            )
            return {
                'name': 'litellm',
                'ok': False,
                'latency_ms': latency_ms,
                'error': str(e),
                'url': settings.litellm_proxy_url,
            }


@router.get('/health')
async def providers_health(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict[str, Any]:
    """Return health details for supported providers."""
    with tracer.start_as_current_span('providers_health_check') as span:
        start = time.perf_counter()
        ollama = await _check_ollama()
        litellm = await _check_litellm()
        took_ms = int((time.perf_counter() - start) * 1000)
        overall_ok = all([ollama.get('ok'), litellm.get('ok')])
        span.set_attribute('health.overall_status', 'ok' if overall_ok else 'degraded')
        span.set_attribute('health.total_latency_ms', took_ms)
        span.set_attribute('health.ollama_ok', ollama.get('ok', False))
        span.set_attribute('health.litellm_ok', litellm.get('ok', False))
        return {
            'status': 'ok' if overall_ok else 'degraded',
            'took_ms': took_ms,
            'providers': {
                'ollama': ollama,
                'litellm': litellm,
            },
        }
