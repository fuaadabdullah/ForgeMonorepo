import json
from typing import Annotated, Any, cast

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..api.auth import get_current_active_user
from ..config import settings
from ..models.user import User
from ..observability.sentry import add_breadcrumb, capture_exception
from ..observability.tracing import get_tracer

router = APIRouter()
tracer = get_tracer(__name__)


class OllamaModel(BaseModel):
    name: str
    size: int | None = None
    digest: str | None = None


@router.get('/models', response_model=list[OllamaModel])
async def list_models(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> list[OllamaModel]:
    """List installed Ollama models via /api/tags."""
    with tracer.start_as_current_span('ollama_list_models') as span:
        print(f'DEBUG: ollama_base_url = {settings.ollama_base_url}')  # Debug
        if not settings.ollama_base_url:
            raise HTTPException(status_code=500, detail='Ollama base URL not configured')
        url = settings.ollama_base_url.rstrip('/') + '/api/tags'
        span.set_attribute('ollama.endpoint', 'tags')
        span.set_attribute('ollama.url', url)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(url)
            if r.status_code != 200:
                span.set_attribute('ollama.status_code', r.status_code)
                span.set_attribute('ollama.error', f'HTTP {r.status_code}')
                raise HTTPException(status_code=502, detail=f'Ollama returned {r.status_code}')
            data = r.json()
            models = []
            for m in data.get('models', []):
                models.append(
                    OllamaModel(name=m.get('name', ''), size=m.get('size'), digest=m.get('digest'))
                )
            span.set_attribute('ollama.models_count', len(models))
            return models
        except HTTPException:
            raise
        except Exception as e:
            span.set_attribute('ollama.error', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(e, endpoint='list_models', url=url)
            add_breadcrumb(
                f'Ollama list models failed: {str(e)}',
                category='api_error',
                level='error',
                endpoint='list_models',
            )
            raise HTTPException(status_code=502, detail=f'Failed to fetch models: {e}') from e


class PullRequest(BaseModel):
    model: str
    stream: bool = False


@router.post('/pull')
async def pull_model(
    body: PullRequest, current_user: Annotated[User, Depends(get_current_active_user)]
) -> dict[str, Any]:
    """Trigger model pull via /api/pull (non-streaming by default)."""
    with tracer.start_as_current_span('ollama_pull_model') as span:
        if not settings.ollama_base_url:
            raise HTTPException(status_code=500, detail='Ollama base URL not configured')
        url = settings.ollama_base_url.rstrip('/') + '/api/pull'
        payload = {'name': body.model, 'stream': body.stream}
        span.set_attribute('ollama.endpoint', 'pull')
        span.set_attribute('ollama.url', url)
        span.set_attribute('ollama.model', body.model)
        span.set_attribute('ollama.stream', body.stream)
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                r = await client.post(url, json=payload)
            # For non-streaming, Ollama returns a JSON object with status fields
            if r.status_code != 200:
                span.set_attribute('ollama.status_code', r.status_code)
                span.set_attribute('ollama.error', f'HTTP {r.status_code}')
                raise HTTPException(status_code=502, detail=f'Ollama pull returned {r.status_code}')
            result = cast(dict[str, Any], r.json())
            span.set_attribute('ollama.pull_status', result.get('status', 'unknown'))
            return result
        except HTTPException:
            raise
        except Exception as e:
            span.set_attribute('ollama.error', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(e, endpoint='pull_model', model=body.model, url=url)
            add_breadcrumb(
                f'Ollama pull model failed: {str(e)}',
                category='api_error',
                level='error',
                endpoint='pull_model',
                model=body.model,
            )
            raise HTTPException(status_code=502, detail=f'Failed to pull model: {e}') from e


@router.delete('/models/{model_name}')
async def delete_model(
    model_name: str, current_user: Annotated[User, Depends(get_current_active_user)]
) -> dict[str, str]:
    """Delete/uninstall an Ollama model via /api/delete."""
    with tracer.start_as_current_span('ollama_delete_model') as span:
        if not settings.ollama_base_url:
            raise HTTPException(status_code=500, detail='Ollama base URL not configured')
        url = settings.ollama_base_url.rstrip('/') + '/api/delete'
        payload = {'name': model_name}
        span.set_attribute('ollama.endpoint', 'delete')
        span.set_attribute('ollama.url', url)
        span.set_attribute('ollama.model', model_name)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.delete(  # type: ignore[call-arg]
                    url, content=json.dumps(payload), headers={'Content-Type': 'application/json'}
                )
            if r.status_code != 200:
                span.set_attribute('ollama.status_code', r.status_code)
                span.set_attribute('ollama.error', f'HTTP {r.status_code}')
                raise HTTPException(
                    status_code=502, detail=f'Ollama delete returned {r.status_code}'
                )
            span.set_attribute('ollama.delete_status', 'success')
            return {'message': f'Model {model_name} deleted successfully'}
        except HTTPException:
            raise
        except Exception as e:
            span.set_attribute('ollama.error', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(e, endpoint='delete_model', model=model_name, url=url)
            add_breadcrumb(
                f'Ollama delete model failed: {str(e)}',
                category='api_error',
                level='error',
                endpoint='delete_model',
                model=model_name,
            )
            raise HTTPException(status_code=502, detail=f'Failed to delete model: {e}') from e


@router.get('/models/{model_name}', response_model=dict[str, Any])
async def get_model_details(
    model_name: str, current_user: Annotated[User, Depends(get_current_active_user)]
) -> dict[str, Any]:
    """Get detailed information about a specific Ollama model via /api/show."""
    with tracer.start_as_current_span('ollama_get_model_details') as span:
        if not settings.ollama_base_url:
            raise HTTPException(status_code=500, detail='Ollama base URL not configured')
        url = settings.ollama_base_url.rstrip('/') + '/api/show'
        payload = {'name': model_name}
        span.set_attribute('ollama.endpoint', 'show')
        span.set_attribute('ollama.url', url)
        span.set_attribute('ollama.model', model_name)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(url, json=payload)
            if r.status_code != 200:
                span.set_attribute('ollama.status_code', r.status_code)
                span.set_attribute('ollama.error', f'HTTP {r.status_code}')
                raise HTTPException(status_code=502, detail=f'Ollama show returned {r.status_code}')
            data = cast(dict[str, Any], r.json())
            span.set_attribute('ollama.model_found', 'name' in data)
            return data
        except HTTPException:
            raise
        except Exception as e:
            span.set_attribute('ollama.error', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(e, endpoint='get_model_details', model=model_name, url=url)
            add_breadcrumb(
                f'Ollama get model details failed: {str(e)}',
                category='api_error',
                level='error',
                endpoint='get_model_details',
                model=model_name,
            )
            raise HTTPException(status_code=502, detail=f'Failed to get model details: {e}') from e
