from typing import AsyncIterator
import asyncio

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import os

router = APIRouter()

LISTENERS: list[asyncio.Queue] = []


class NotificationPayload(BaseModel):
    title: str
    body: str
    level: str | None = "info"


@router.post("/notifications")
async def post_notification(payload: NotificationPayload, request: Request):
    """Accept a notification from internal services (Temporal activities) and broadcast to connected clients.

    Optional simple secret check: set NOTIFICATIONS_SECRET in env and require header X-Notify-Secret.
    """
    secret = os.getenv("NOTIFICATIONS_SECRET")
    if secret:
        header = request.headers.get("x-notify-secret")
        if header != secret:
            raise HTTPException(status_code=403, detail="Invalid notification secret")

    # Broadcast to all connected listeners
    for q in LISTENERS:
        # Use put_nowait to avoid awaiting
        try:
            q.put_nowait(payload.json())
        except asyncio.QueueFull:
            # drop if queue full
            pass

    return {"status": "ok"}


@router.get("/notifications/stream")
async def notifications_stream(request: Request):
    """Server-Sent Events endpoint that streams notifications to clients."""

    q: asyncio.Queue = asyncio.Queue(maxsize=32)
    LISTENERS.append(q)

    async def event_generator() -> AsyncIterator[str]:
        try:
            while True:
                # If client disconnects, stop
                if await request.is_disconnected():
                    break
                try:
                    item = await asyncio.wait_for(q.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    # keep connection alive
                    yield "event: ping\n\n"
                    continue
                # SSE format: data: <json>\n\n
                yield f"data: {item}\n\n"
        finally:
            try:
                LISTENERS.remove(q)
            except ValueError:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")
