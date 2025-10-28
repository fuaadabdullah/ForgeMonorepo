"""
Chat API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response models
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    stream: bool = False


class ChatResponse(BaseModel):
    response: str
    routing: dict
    metrics: dict


class ChatHistory(BaseModel):
    messages: List[ChatMessage]


# Chat endpoint
@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to Overmind and get a response.

    The message is routed to the optimal LLM based on complexity and cost.
    """
    try:
        # Call Node.js service (which runs the TypeScript Overmind)
        async with httpx.AsyncClient(timeout=settings.node_bridge_timeout) as client:
            response = await client.post(
                f"{settings.node_bridge_url}/chat",
                json={"message": request.message},
            )
            response.raise_for_status()
            data = response.json()

        return ChatResponse(**data)

    except httpx.HTTPError as e:
        logger.error(f"Failed to call Node service: {e}")
        raise HTTPException(status_code=500, detail=f"Overmind service error: {str(e)}")


# Get chat history
@router.get("/history", response_model=ChatHistory)
async def get_history():
    """Get conversation history"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.node_bridge_url}/chat/history")
            response.raise_for_status()
            data = response.json()

        return ChatHistory(messages=data.get("messages", []))

    except httpx.HTTPError as e:
        logger.error(f"Failed to get history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Clear history
@router.delete("/history")
async def clear_history():
    """Clear conversation history"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(f"{settings.node_bridge_url}/chat/history")
            response.raise_for_status()

        return {"status": "ok", "message": "History cleared"}

    except httpx.HTTPError as e:
        logger.error(f"Failed to clear history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
