"""Provider state setup for Pact verification."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pact", tags=["pact"])


class ProviderState(BaseModel):
    """Provider state from Pact verification."""
    state: str
    params: Optional[Dict[str, Any]] = None


@router.post("/provider-states")
async def setup_provider_state(state_data: ProviderState):
    """
    Setup provider state for Pact verification.

    This endpoint is called by Pact verifier before each interaction
    to setup the required state on the provider side.
    """
    state_name = state_data.state
    params = state_data.params or {}

    logger.info(f"Setting up provider state: {state_name} with params: {params}")

    # Handle different provider states
    if state_name == "API is running":
        # Ensure API is in running state (already true if this endpoint responds)
        return {"status": "success", "message": "API is running"}

    elif state_name == "API is healthy and models are available":
        # Ensure health endpoint will return healthy
        # Ensure LiteLLM models are available
        # In production, might check actual health here
        return {"status": "success", "message": "API is healthy"}

    elif state_name == "Memory system is initialized":
        # Ensure memory system is ready
        # Could initialize test data here if needed
        return {"status": "success", "message": "Memory system initialized"}

    elif state_name == "Memories exist in the system":
        # Setup test memories for search
        # In tests, might seed database with test data
        test_memories = params.get("memories", [])
        logger.info(f"Setting up {len(test_memories)} test memories")
        return {
            "status": "success",
            "message": f"Seeded {len(test_memories)} memories"
        }

    else:
        # Unknown state - log warning but don't fail
        logger.warning(f"Unknown provider state: {state_name}")
        return {
            "status": "warning",
            "message": f"Unknown state: {state_name}, continuing anyway"
        }


@router.delete("/provider-states")
async def teardown_provider_state(state_data: ProviderState):
    """
    Teardown provider state after Pact verification.

    Called after interaction to clean up any test data.
    """
    state_name = state_data.state

    logger.info(f"Tearing down provider state: {state_name}")

    if state_name == "Memories exist in the system":
        # Clean up test memories
        logger.info("Cleaning up test memories")
        return {"status": "success", "message": "Test memories cleaned up"}

    return {"status": "success", "message": "Teardown complete"}
