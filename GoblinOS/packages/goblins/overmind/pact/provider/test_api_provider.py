"""Pact provider verification tests for Overmind API."""

import pytest
import os
from pact import Verifier


@pytest.fixture(scope="module")
def pact_verifier():
    """Configure Pact verifier for API provider."""
    return Verifier(
        provider="overmind-api",
        provider_base_url=os.getenv("PROVIDER_URL", "http://localhost:8000")
    )


def test_verify_bridge_contracts_from_broker(pact_verifier):
    """
    Verify API fulfills Bridge contracts from Pact Broker.

    Requires:
    - PACT_BROKER_URL environment variable
    - PACT_BROKER_TOKEN environment variable
    - GIT_COMMIT environment variable (for versioning)
    - API server running on PROVIDER_URL (default: http://localhost:8000)
    """
    broker_url = os.getenv("PACT_BROKER_URL")
    broker_token = os.getenv("PACT_BROKER_TOKEN")
    git_commit = os.getenv("GIT_COMMIT", "local-dev")

    if not broker_url or not broker_token:
        pytest.skip("PACT_BROKER_URL and PACT_BROKER_TOKEN required")

    success, logs = pact_verifier.verify_with_broker(
        broker_url=broker_url,
        broker_token=broker_token,
        provider_version=git_commit,
        publish_verification_results=True,
        provider_states_setup_url=f"{pact_verifier.provider_base_url}/pact/provider-states",
        enable_pending=True,  # Allow pending pacts (new consumer versions)
        include_wip_pacts_since=None  # Include WIP pacts from all time
    )

    assert success == 0, f"Pact verification failed:\n{logs}"


def test_verify_bridge_contracts_from_file(pact_verifier):
    """
    Verify API fulfills Bridge contracts from local file.

    Useful for:
    - Local development
    - CI without Pact Broker
    - Quick verification
    """
    pact_file = "./pact/pacts/overmind-bridge-overmind-api.json"

    if not os.path.exists(pact_file):
        pytest.skip(f"Pact file not found: {pact_file}")

    success, logs = pact_verifier.verify_pact_files(
        pact_file,
        provider_states_setup_url=f"{pact_verifier.provider_base_url}/pact/provider-states"
    )

    assert success == 0, f"Pact verification failed:\n{logs}"


@pytest.mark.integration
def test_provider_states_endpoint():
    """Test that provider states endpoint is accessible."""
    import httpx

    provider_url = os.getenv("PROVIDER_URL", "http://localhost:8000")

    # Test provider state setup
    response = httpx.post(
        f"{provider_url}/pact/provider-states",
        json={"state": "API is healthy and models are available"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
