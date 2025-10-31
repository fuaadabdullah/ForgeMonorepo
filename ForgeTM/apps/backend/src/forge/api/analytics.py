from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from ..api.auth import get_current_active_user
from ..models.user import User

router = APIRouter()

# In-memory storage for demo purposes
# In production, this would be stored in a database
_routing_decisions: list[dict[str, Any]] = []
_provider_usage: dict[str, int] = {}
_latency_stats: dict[str, float] = {}


@router.get('/analytics')
async def get_routing_analytics(
    current_user: User = Depends(get_current_active_user),
) -> dict[str, Any]:
    """Get comprehensive routing analytics and statistics."""
    try:
        # Calculate total requests
        total_requests = len(_routing_decisions)

        # Calculate provider usage
        provider_usage: dict[str, int] = {}
        for decision in _routing_decisions:
            provider = decision.get('selectedProvider', 'unknown')
            provider_usage[provider] = provider_usage.get(provider, 0) + 1

        # Calculate average latency by provider
        latency_by_provider: dict[str, float] = {}
        latency_counts: dict[str, int] = {}
        for decision in _routing_decisions:
            provider = decision.get('selectedProvider', 'unknown')
            latency = decision.get('latency')
            if latency is not None:
                if provider not in latency_by_provider:
                    latency_by_provider[provider] = 0.0
                    latency_counts[provider] = 0
                latency_by_provider[provider] += latency
                latency_counts[provider] += 1

        average_latency: dict[str, float] = {}
        for provider in latency_by_provider:
            if latency_counts[provider] > 0:
                average_latency[provider] = latency_by_provider[provider] / latency_counts[provider]

        # Calculate cost savings (simplified - Ollama is free vs cloud costs)
        ollama_requests = provider_usage.get('ollama', 0)
        cost_savings = ollama_requests * 0.02  # Assuming $0.02 average savings per request

        # Calculate fallback rate
        fallback_count = len([d for d in _routing_decisions if d.get('fallbackUsed', False)])
        fallback_rate = fallback_count / total_requests if total_requests > 0 else 0

        # Get recent decisions (last 50)
        recent_decisions = _routing_decisions[-50:] if _routing_decisions else []

        return {
            'totalRequests': total_requests,
            'providerUsage': provider_usage,
            'averageLatency': average_latency,
            'costSavings': cost_savings,
            'fallbackRate': fallback_rate,
            'recentDecisions': recent_decisions,
        }

    except Exception as e:
        detail = f'Failed to get routing analytics: {str(e)}'
        raise HTTPException(status_code=500, detail=detail) from e


def record_routing_decision(
    task_type: str,
    selected_provider: str,
    selected_model: str,
    reason: str,
    latency: float | None = None,
    cost: float | None = None,
    fallback_used: bool = False,
) -> None:
    """Record a routing decision for analytics."""
    decision = {
        'timestamp': datetime.now().isoformat(),
        'taskType': task_type,
        'selectedProvider': selected_provider,
        'selectedModel': selected_model,
        'reason': reason,
        'latency': latency,
        'cost': cost,
        'fallbackUsed': fallback_used,
    }

    _routing_decisions.append(decision)

    # Keep only last 1000 decisions to prevent memory issues
    if len(_routing_decisions) > 1000:
        _routing_decisions.pop(0)


@router.post('/analytics/test-data')
async def add_test_data(
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    """Add sample routing decisions for testing."""
    import random

    # Add some sample routing decisions
    providers = ['ollama', 'openai', 'gemini', 'deepseek']
    models = ['llama2', 'gpt-4', 'gemini-pro', 'deepseek-chat']
    tasks = ['chat', 'completion', 'embedding']
    reasons = [
        'Cost optimization for simple task',
        'High quality required for complex task',
        'Local processing for privacy',
        'Fallback due to provider unavailability',
        'Best latency for real-time response',
    ]

    for _ in range(25):
        provider = random.choice(providers)
        model = random.choice(models)
        task = random.choice(tasks)
        reason = random.choice(reasons)
        latency = random.uniform(0.3, 2.5) if random.random() > 0.1 else None
        cost = random.uniform(0.005, 0.08) if provider != 'ollama' and random.random() > 0.15 else None
        fallback = random.random() < 0.08

        record_routing_decision(
            task_type=task,
            selected_provider=provider,
            selected_model=model,
            reason=reason,
            latency=latency,
            cost=cost,
            fallback_used=fallback,
        )

    return {'message': 'Test data added'}


@router.post('/analytics/dashboard')
async def record_dashboard_telemetry(
    data: dict[str, Any],
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    """Record dashboard telemetry data."""
    # For now, just log it. In production, store in database
    print(f"Dashboard telemetry: {data}")
    return {'message': 'Telemetry recorded'}
