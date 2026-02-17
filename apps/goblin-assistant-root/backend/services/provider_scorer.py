"""
Provider scoring service.

Scores candidate providers using a weighted multi-factor model:
  - Health      (40 %): is the provider currently healthy in the registry?
  - Cost        (30 %): lower cost_per_token_input is better
  - Latency fit (20 %): local providers preferred for ultra-low latency requests
  - Capability  (10 %): does the provider advertise the requested capability?

All factors are normalised to [0, 1] and combined into a final score in
the same range.  The scorer never removes candidates — it only annotates
them with a "score" key so the selector can make the final decision.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Weight table — must sum to 1.0
_WEIGHTS = {
    "health": 0.40,
    "cost": 0.30,
    "latency": 0.20,
    "capability": 0.10,
}

# Latency priority values that strongly prefer local / low-latency providers
_LOW_LATENCY_PRIORITIES = {"ultra_low", "low"}

# Heuristic: providers whose ID contains these substrings are considered "local"
_LOCAL_PROVIDER_HINTS = {"ollama", "llamacpp", "local"}


def _is_local_provider(provider_id: str) -> bool:
    pid = provider_id.lower()
    return any(hint in pid for hint in _LOCAL_PROVIDER_HINTS)


class ProviderScorer:
    """Score a list of candidate provider dicts returned by ProviderDiscovery."""

    async def score_providers(
        self,
        candidates: List[Dict[str, Any]],
        capability: str,
        requirements: Optional[Dict[str, Any]] = None,
        sla_target_ms: Optional[float] = None,
        cost_budget: Optional[float] = None,
        latency_priority: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Attach a "score" [0, 1] to each candidate and return the list.
        Candidates are dicts that may contain any of these keys:
          provider_id, name, endpoint, cost_per_token_input, capabilities, is_healthy.
        """
        if not candidates:
            return candidates

        # Lazy import to avoid circular dependencies at module load time
        from ..providers.registry import get_provider_registry  # noqa: PLC0415
        from ..providers.base import HealthStatus  # noqa: PLC0415

        registry = get_provider_registry()

        # Build a set of healthy provider IDs for O(1) lookups
        try:
            healthy_ids = {
                getattr(p, "provider_id", "") for p in registry.get_available_providers()
            }
        except Exception as exc:
            logger.warning("Could not query registry for healthy providers: %s", exc)
            healthy_ids = set()

        # --- collect cost range across candidates for normalisation ---
        raw_costs: List[float] = []
        for c in candidates:
            pid = c.get("provider_id") or c.get("name", "")
            provider_obj = registry.get_provider(pid)
            if provider_obj is not None:
                cost = provider_obj.capabilities.get("cost_per_token_input", 0.0)
            else:
                cost = float(c.get("cost_per_token_input", 0.0))
            raw_costs.append(cost)

        max_cost = max(raw_costs) if any(c > 0 for c in raw_costs) else 1.0

        scored: List[Dict[str, Any]] = []
        for candidate, raw_cost in zip(candidates, raw_costs):
            c = dict(candidate)  # shallow copy — don't mutate caller's list
            pid = c.get("provider_id") or c.get("name", "")

            # --- Health factor ---
            if c.get("is_healthy") is not None:
                health_score = 1.0 if c["is_healthy"] else 0.0
            else:
                health_score = 1.0 if pid in healthy_ids else 0.0

            # --- Cost factor (lower is better; normalised to [0, 1]) ---
            if max_cost > 0:
                cost_score = 1.0 - (raw_cost / max_cost)
            else:
                cost_score = 1.0  # all free / unknown cost

            # Penalise if candidate would exceed user's cost budget
            if cost_budget is not None and raw_cost > cost_budget:
                cost_score *= 0.1

            # --- Latency factor ---
            if latency_priority in _LOW_LATENCY_PRIORITIES:
                latency_score = 1.0 if _is_local_provider(pid) else 0.3
            else:
                latency_score = 1.0  # no preference

            # --- Capability factor ---
            provider_obj = registry.get_provider(pid)
            if provider_obj is not None:
                caps = provider_obj.capabilities
                cap_list = caps.get("capabilities", [])
                cap_score = 1.0 if capability in cap_list or caps.get(f"supports_{capability}") else 0.5
            else:
                declared_caps = c.get("capabilities", [])
                cap_score = 1.0 if capability in declared_caps else 0.5

            # --- Weighted composite ---
            score = (
                health_score * _WEIGHTS["health"]
                + cost_score * _WEIGHTS["cost"]
                + latency_score * _WEIGHTS["latency"]
                + cap_score * _WEIGHTS["capability"]
            )

            c["score"] = round(score, 4)
            c["_score_breakdown"] = {
                "health": health_score,
                "cost": cost_score,
                "latency": latency_score,
                "capability": cap_score,
            }
            scored.append(c)

        logger.debug(
            "ProviderScorer.score_providers: capability=%s, %d candidates scored",
            capability,
            len(scored),
        )
        return scored
