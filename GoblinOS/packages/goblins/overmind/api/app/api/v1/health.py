"""
System health endpoints
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
import httpx

from app.config import settings

router = APIRouter()


class HealthCheck(BaseModel):
    status: str
    node_service: str
    providers: list


@router.get("/health", response_model=HealthCheck)
async def health():
    """Extended health check including Node.js service"""
    node_status = "unknown"
    providers = []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.node_bridge_url}/health")
            if response.status_code == 200:
                node_status = "ok"
                data = response.json()
                providers = data.get("providers", [])
    except Exception:
        node_status = "error"

    overall_status = "healthy" if node_status == "ok" else "degraded"

    return HealthCheck(
        status=overall_status,
        node_service=node_status,
        providers=providers,
    )


@router.get("/providers")
async def get_providers():
    """Get available LLM providers"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.node_bridge_url}/providers")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError:
        return {"providers": [], "error": "Unable to fetch providers"}
