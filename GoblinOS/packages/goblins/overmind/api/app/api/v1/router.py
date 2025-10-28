"""
Main API v1 router
"""

from fastapi import APIRouter
from app.api.v1 import chat, health

api_router = APIRouter()

# Include sub-routers
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(health.router, prefix="/system", tags=["system"])
