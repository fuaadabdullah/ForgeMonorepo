from __future__ import annotations

import asyncio
import logging
from typing import List, Dict, Any, Tuple, TYPE_CHECKING

from fastapi import APIRouter, Request, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse

from .services.imports import (
    get_auth_service,
    settings,
    get_gateway_service,
    TokenBudgetExceeded,
    MaxTokensExceeded,
    get_chat_routing_service,
)
from .services import (
    request_validation,
    response_builder,
    provider_factory,
    rag_processor,
    scaling_processor,
    verification_processor,
    config_processor,
    chat_controller,
)
from .services.latency_monitoring_service import LatencyMonitoringService
from .services.token_accounting import TokenAccountingService
from .errors import (
    raise_validation_error,
    raise_internal_error,
    raise_service_unavailable,
    raise_problem,
    map_exception_to_problem,
)
from .auth.policies import AuthScope
from .services.types import GatewayCheckResult

if TYPE_CHECKING:
    from .services.routing import RoutingService

    RoutingServiceType = RoutingService
else:
    RoutingServiceType = Any

logger = logging.getLogger(__name__)

# Re-export get_routing_encryption_key for backward compatibility with tests
get_routing_encryption_key = config_processor.get_routing_encryption_key

# Security schemes
security = HTTPBearer()
token_accountant = TokenAccountingService()

# Initialize latency monitoring service
latency_monitor = LatencyMonitoringService()

router = APIRouter(prefix="/chat", tags=["chat"])


def require_scope(required_scope: AuthScope):
    """Dependency to require a specific scope."""

    def scope_checker(
        credentials: HTTPAuthorizationCredentials = Security(security),
    ) -> List[str]:
        auth_service = get_auth_service()

        # Try JWT token first
        token = credentials.credentials
        claims = auth_service.validate_access_token(token)

        if claims:
            # Convert AuthScope enums back to strings
            scopes = auth_service.get_user_scopes(claims)
            scope_values = [scope.value for scope in scopes]

            if required_scope.value not in scope_values:
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required scope: {required_scope.value}",
                )
            return scope_values

        raise HTTPException(status_code=401, detail="Invalid authentication")

    return scope_checker


# Import the request validation service
ChatCompletionRequest = request_validation.ChatCompletionRequest
ChatCompletionResponse = response_builder.ChatCompletionResponse
# Backwards-compatible exports expected by older tests and callers
# (tests import these directly from `chat_router`). Keep as thin wrappers
# that delegate to the validation service so behavior is unchanged.
ChatMessage = request_validation.ChatMessage


def validate_chat_request(request: ChatCompletionRequest) -> None:
    """Backward-compatible wrapper used by legacy callers and tests."""
    return request_validation.validate_chat_request(request)


async def _check_gateway_and_prepare(
    request: ChatCompletionRequest,
    gateway_service,
) -> Tuple[List[Dict], GatewayCheckResult]:
    """Validate request, prepare messages, and run gateway checks."""

    request_validation.validate_chat_request(request)
    messages = config_processor.prepare_messages(request)

    raw = await gateway_service.process_request(
        messages=messages,
        max_tokens=request.max_tokens,
        context=request.context,
    )

    result = GatewayCheckResult(
        allowed=getattr(raw, "allowed", True),
        intent=getattr(raw, "intent", None),
        estimated_tokens=getattr(raw, "estimated_tokens", None),
        risk_score=getattr(raw, "risk_score", None),
        fallback_level=getattr(raw, "fallback_level", None),
        retry_after=getattr(raw, "retry_after", None),
        raw=getattr(raw, "__dict__", None),
    )

    intent_val = getattr(getattr(result, "intent", None), "value", result.intent)
    logger.info(
        "Gateway analysis",
        extra={
            "intent": intent_val,
            "estimated_tokens": result.estimated_tokens,
            "risk_score": result.risk_score,
            "allowed": result.allowed,
        },
    )

    if not result.allowed:
        raise_problem(
            status=400,
            title="Gateway rejected request",
            detail="Request flagged as high-risk. Reduce token limits or simplify request.",
            type_uri="https://goblin-backend.fly.dev/errors/gateway-denied",
            code="GATEWAY_DENIED",
        )

    return messages, result


@router.post("/completions", response_model=None)
async def create_chat_completion(
    request: ChatCompletionRequest,
    req: Request,
    service: "RoutingServiceType" = Depends(get_chat_routing_service),
    scopes: List[str] = Depends(require_scope(AuthScope.WRITE_CONVERSATIONS)),
):
    """
    Create a chat completion with intelligent routing to the best model.

    This endpoint automatically selects the optimal local or cloud LLM based on:
    - Intent (code-gen, creative, rag, chat, classification, etc.)
    - Context length (short vs long documents)
    - Latency requirements (ultra-low, low, medium, high)
    - Cost priority (optimize for cost vs quality)

    Examples (abridged):
      - Code gen, quick status, long-document RAG, conversational chat.

    Note: route registration is deferred at import-time in tests to avoid
    FastAPI trying to introspect application-only dependency types.
    """

    gateway_service = get_gateway_service()
    gateway_result = None

    try:
        controller = chat_controller.ChatController()
        orchestration_result = await controller.orchestrate_completion(
            request, req, service, gateway_service
        )

        # Check if orchestration failed
        if not orchestration_result.get("success", True):
            routing_result = orchestration_result.get("routing_result", {})
            error_msg = orchestration_result.get("error", "Unknown error")

            if "Rate limit exceeded" in error_msg:
                fallback_level = routing_result.get("fallback_level", "deny")
                retry_after = routing_result.get("retry_after")

                if fallback_level == "deny":
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded. Please try again later.",
                        headers={
                            "Retry-After": str(int(retry_after))
                            if retry_after
                            else "60"
                        },
                    )
                if fallback_level == "cheap_model":
                    logger.warning(
                        f"Rate limited request {routing_result.get('request_id')} using cheap fallback"
                    )

            # Custom error for creative/essay requests
            if request.messages and any(
                "essay" in m.content.lower() or "creative" in m.content.lower()
                for m in request.messages
            ):
                raise HTTPException(
                    status_code=503,
                    detail="Essay generation failed. Please try again or rephrase your request.",
                )

            raise_service_unavailable(f"No suitable provider available: {error_msg}")

        # Check for emergency mode
        routing_result = orchestration_result.get("routing_result", {})
        if routing_result.get("emergency_mode"):
            logger.warning(
                f"Request {routing_result.get('request_id')} served in emergency mode"
            )

        # Record token usage for successful requests
        gateway_result = orchestration_result.get("gateway_result")
        if orchestration_result.get("tokens_used", 0) > 0 and gateway_result:
            try:
                await gateway_service.record_usage(
                    None,
                    orchestration_result["tokens_used"],
                    intent=gateway_result.intent,
                    success=orchestration_result.get("success", True),
                )
            except Exception as e:
                logger.warning(f"Failed to record token usage: {e}")

        return ChatCompletionResponse(**orchestration_result)

    except HTTPException:
        raise
    except Exception as e:
        if gateway_result:
            try:
                await gateway_service.record_usage(
                    None,
                    0,
                    intent=getattr(gateway_result, "intent", None),
                    success=False,
                    error_type=type(e).__name__,
                )
            except Exception as record_error:
                logger.warning(
                    "Failed to record failed request anomaly",
                    extra={"error": str(record_error)},
                )

        problem = map_exception_to_problem(e, getattr(req.state, "correlation_id", None))
        logger.exception(
            "Chat completion failed",
            extra={
                "correlation_id": getattr(req.state, "correlation_id", None),
                "request_id": getattr(req.state, "request_id", None),
                "problem": problem.model_dump(),
            },
        )
        raise HTTPException(status_code=problem.status, detail=problem.model_dump())

@router.get("/essay")
async def essay_redirect():
    """Temporary backward-compatible redirect for /chat/essay -> /essay."""
    return RedirectResponse(url="/essay", status_code=307)


@router.get("/models")
async def list_available_models(
    req: Request,
    service: "RoutingService" = Depends(get_chat_routing_service),
):
    """
    List all available models across all providers.
    Includes routing recommendations for each model.
    """
    try:
        providers = await service.discover_providers()

        models = []
        for provider in providers:
            for model in provider["models"]:
                models.append(
                    {
                        "id": model["id"],
                        "provider": provider["display_name"],
                        "provider_name": provider["name"],
                        "capabilities": model.get("capabilities", []),
                        "context_window": model.get("context_window", 0),
                        "pricing": model.get("pricing", {}),
                    }
                )

        # Add routing recommendations
        routing_recommendations = {
            "gemma:2b": "Ultra-fast responses, classification, status checks",
            "phi3:3.8b": "Low-latency chat, conversational UI",
            "qwen2.5:3b": "Long context (32K), multilingual, RAG",
            "mistral:7b": "High quality, code generation, creative writing",
        }

        for model in models:
            model["routing_recommendation"] = routing_recommendations.get(
                model["id"], "General purpose"
            )

        return {
            "models": models,
            "total_count": len(models),
            "routing_info": {
                "automatic": True,
                "factors": [
                    "intent",
                    "context_length",
                    "latency_target",
                    "cost_priority",
                ],
                "documentation": "/docs/LOCAL_LLM_ROUTING.md",
            },
        }

    except Exception as e:
        logger.error(
            f"Failed to list models: {e}",
            extra={
                "correlation_id": getattr(req.state, "correlation_id", None),
                "request_id": getattr(req.state, "request_id", None),
            },
        )
        raise_internal_error(f"Failed to list models: {str(e)}")


@router.get("/routing-info")
async def get_routing_info():
    """
    Get information about the intelligent routing system.
    """
    return {
        "routing_system": "intelligent",
        "version": "1.0",
        "factors": {
            "intent": {
                "description": "Detected or explicit intent (code-gen, creative, rag, chat, etc.)",
                "options": [
                    "code-gen",
                    "creative",
                    "explain",
                    "summarize",
                    "rag",
                    "retrieval",
                    "chat",
                    "classification",
                    "status",
                    "translation",
                ],
                "auto_detect": True,
            },
            "latency_target": {
                "description": "Target latency for response",
                "options": ["ultra_low", "low", "medium", "high"],
                "default": "medium",
            },
            "context_length": {
                "description": "Length of the conversation context",
                "thresholds": {
                    "short": "< 2000 tokens",
                    "medium": "2000-8000 tokens",
                    "long": "> 8000 tokens (uses qwen2.5:3b with 32K window)",
                },
            },
            "cost_priority": {
                "description": "Prioritize cost over quality",
                "default": False,
                "effect": "Routes to smaller, faster models when enabled",
            },
        },
        "models": {
            "gemma:2b": {
                "size": "1.7GB",
                "context": "8K tokens",
                "latency": "5-8s",
                "best_for": ["ultra_fast", "classification", "status_checks"],
                "params": {"temperature": 0.0, "max_tokens": 40},
            },
            "phi3:3.8b": {
                "size": "2.2GB",
                "context": "4K tokens",
                "latency": "10-12s",
                "best_for": ["low_latency_chat", "conversational_ui", "quick_qa"],
                "params": {"temperature": 0.15, "max_tokens": 128},
            },
            "qwen2.5:3b": {
                "size": "1.9GB",
                "context": "32K tokens",
                "latency": "14s",
                "best_for": [
                    "long_context",
                    "multilingual",
                    "rag",
                    "document_retrieval",
                ],
                "params": {"temperature": 0.0, "max_tokens": 1024},
            },
            "mistral:7b": {
                "size": "4.4GB",
                "context": "8K tokens",
                "latency": "14-15s",
                "best_for": [
                    "high_quality",
                    "code_generation",
                    "creative_writing",
                    "explanations",
                ],
                "params": {"temperature": 0.2, "max_tokens": 512},
            },
        },
        "cost": {
            "per_request": "$0 (self-hosted)",
            "monthly_infrastructure": "$15-20",
            "savings_vs_cloud": "86-92% ($110-240/month)",
        },
    }
