from collections.abc import AsyncGenerator
from typing import Annotated, Any

import litellm
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..api.auth import get_current_active_user
from ..config import settings
from ..models.user import User
from ..observability.sentry import add_breadcrumb, capture_exception
from ..observability.tracing import get_tracer

router = APIRouter()
tracer = get_tracer(__name__)


class ChatMessage(BaseModel):
    role: str = Field(..., description='Role of the message sender (user, assistant, system)')
    content: str = Field(..., description='Content of the message')


class ChatCompletionRequest(BaseModel):
    model: str = Field(..., description='Model to use for completion')
    messages: list[ChatMessage] = Field(..., description='List of messages in the conversation')
    temperature: float | None = Field(0.7, description='Sampling temperature (0.0 to 2.0)')
    max_tokens: int | None = Field(None, description='Maximum tokens to generate')
    stream: bool = Field(False, description='Whether to stream the response')
    api_key: str | None = Field(None, description='Optional API key override')


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = 'chat.completion'
    created: int
    model: str
    choices: list[dict[str, Any]]
    usage: dict[str, int] | None = None


@router.post('/chat/completions', response_model=ChatCompletionResponse)
async def chat_completions(
    request: ChatCompletionRequest, current_user: Annotated[User, Depends(get_current_active_user)]
) -> ChatCompletionResponse | StreamingResponse:
    """Unified chat completions endpoint supporting multiple LLM providers via LiteLLM."""
    # Check feature flag for LLM routing
    from openfeature import api
    from openfeature.evaluation_context import EvaluationContext

    client = api.get_client()
    llm_routing_enabled = client.get_boolean_value(
        'llm-routing-enabled',
        default_value=True,  # Default to enabled for backward compatibility
        evaluation_context=EvaluationContext(
            targeting_key='system', attributes={'endpoint': 'chat_completions'}
        ),
    )

    if not llm_routing_enabled:
        raise HTTPException(
            status_code=503, detail='LLM routing is currently disabled. Please try again later.'
        )

    with tracer.start_as_current_span('litellm_chat_completion') as span:
        span.set_attribute('litellm.model', request.model)
        span.set_attribute('litellm.stream', request.stream)
        span.set_attribute('litellm.message_count', len(request.messages))
        span.set_attribute('litellm.temperature', request.temperature or 0.7)
        if request.max_tokens:
            span.set_attribute('litellm.max_tokens', request.max_tokens)

        # Prepare LiteLLM parameters
        litellm_params = {
            'model': request.model,
            'messages': [msg.model_dump() for msg in request.messages],
            'temperature': request.temperature,
            'max_tokens': request.max_tokens,
            'stream': request.stream,
        }

        # Set API keys from environment if not provided
        if not request.api_key:
            # LiteLLM will automatically use environment variables based on model prefix
            # e.g., OPENAI_API_KEY for gpt-*, GEMINI_API_KEY for gemini-*, etc.
            pass

        try:
            if request.stream:
                return StreamingResponse(
                    stream_chat_completion(litellm_params, span), media_type='text/plain'
                )
            else:
                response = await litellm.acompletion(**litellm_params)
                result = ChatCompletionResponse(
                    id=response.id,
                    created=response.created,
                    model=response.model,
                    choices=[choice.model_dump() for choice in response.choices],
                    usage=response.usage.model_dump() if response.usage else None,
                )
                span.set_attribute('litellm.success', True)
                tokens_used = result.usage.get('total_tokens', 0) if result.usage else 0
                span.set_attribute('litellm.tokens_used', tokens_used)
                return result

        except Exception as e:
            span.set_attribute('litellm.success', False)
            span.set_attribute('litellm.error', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(
                e, model=request.model, message_count=len(request.messages), stream=request.stream
            )
            add_breadcrumb(
                f'LiteLLM chat completion failed: {str(e)}',
                category='api_error',
                level='error',
                model=request.model,
                error_type=type(e).__name__,
            )
            raise HTTPException(status_code=502, detail=f'LLM completion failed: {str(e)}') from e


async def stream_chat_completion(
    litellm_params: dict[str, Any], span: Any
) -> AsyncGenerator[str, None]:
    """Stream chat completion responses."""
    try:
        response_iter = await litellm.acompletion(**litellm_params)
        async for chunk in response_iter:
            if chunk.choices and chunk.choices[0].delta.content:
                yield f'data: {chunk.model_dump_json()}\n\n'
        yield 'data: [DONE]\n\n'
    except Exception as e:
        span.set_attribute('litellm.stream_error', str(e))
        yield f'data: {{"error": "{str(e)}"}}\n\n'


class ModelInfo(BaseModel):
    id: str
    object: str = 'model'
    created: int
    owned_by: str


class ModelsResponse(BaseModel):
    object: str = 'list'
    data: list[ModelInfo]


@router.get('/models', response_model=ModelsResponse)
async def list_models(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> ModelsResponse:
    """List available models from all configured providers."""
    with tracer.start_as_current_span('litellm_list_models') as span:
        try:
            # Get available models from LiteLLM
            models = litellm.model_list

            model_infos = []
            for model_id in models:
                model_infos.append(
                    ModelInfo(
                        id=model_id,
                        created=0,  # LiteLLM doesn't provide creation time
                        owned_by='litellm',  # Generic owner
                    )
                )

            span.set_attribute('litellm.models_count', len(model_infos))
            return ModelsResponse(data=model_infos)

        except Exception as e:
            span.set_attribute('litellm.models_error', str(e))
            # Capture error in Sentry for monitoring
            capture_exception(e, endpoint='list_models')
            add_breadcrumb(
                f'LiteLLM list models failed: {str(e)}',
                category='api_error',
                level='error',
                endpoint='list_models',
            )
            raise HTTPException(status_code=502, detail=f'Failed to list models: {str(e)}') from e


@router.get('/providers')
async def get_providers(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict[str, Any]:
    """Get information about configured LLM providers."""
    with tracer.start_as_current_span('litellm_providers') as span:
        providers = {}

        # Check which providers have API keys configured
        if settings.openai_api_key:
            providers['openai'] = {
                'configured': True,
                'models': ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
            }
        else:
            providers['openai'] = {'configured': False}

        if settings.gemini_api_key:
            providers['gemini'] = {
                'configured': True,
                'models': ['gemini-pro', 'gemini-pro-vision'],
            }
        else:
            providers['gemini'] = {'configured': False}

        if settings.deepseek_api_key:
            providers['deepseek'] = {
                'configured': True,
                'models': ['deepseek-chat', 'deepseek-coder'],
            }
        else:
            providers['deepseek'] = {'configured': False}

        span.set_attribute('litellm.providers_count', len(providers))
        configured_count = sum(1 for p in providers.values() if p['configured'])
        span.set_attribute('litellm.configured_providers', configured_count)

        return {
            'providers': providers,
            'total_configured': sum(1 for p in providers.values() if p['configured']),
            'total_available': len(providers),
        }
