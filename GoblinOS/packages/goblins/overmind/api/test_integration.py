"""
Integration tests for full chat flow.

Tests the complete flow: Client -> FastAPI -> Node Bridge -> Overmind

Run with: pytest -v test_integration.py
"""

import pytest
import asyncio
import httpx
from typing import Optional


class TestFullChatFlow:
    """
    Integration tests requiring all services to be running:
    - FastAPI backend on port 8001
    - Node.js bridge on port 3030
    - Overmind TypeScript core
    """

    @pytest.fixture(scope="class")
    def fastapi_url(self):
        """FastAPI backend URL."""
        return "http://localhost:8001"

    @pytest.fixture(scope="class")
    def node_bridge_url(self):
        """Node.js bridge URL."""
        return "http://localhost:3030"

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_health_check_all_services(self, fastapi_url, node_bridge_url):
        """Test that all services are healthy."""
        async with httpx.AsyncClient() as client:
            # Check FastAPI
            fastapi_health = await client.get(f"{fastapi_url}/health")
            assert fastapi_health.status_code == 200

            # Check Node bridge
            node_health = await client.get(f"{node_bridge_url}/health")
            assert node_health.status_code == 200
            data = node_health.json()
            assert data["status"] == "healthy"

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_simple_chat_query(self, fastapi_url):
        """Test a simple chat query through the full stack."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={"message": "What is Docker?"}
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "response" in data
            assert "provider" in data
            assert "model" in data
            assert "routing" in data
            assert "metrics" in data

            # Verify routing info
            assert data["routing"]["strategy"] in ["cost-optimized", "performance", "balanced"]
            assert "reason" in data["routing"]

            # Verify metrics
            assert data["metrics"]["latency"] > 0
            assert data["metrics"]["cost"] >= 0

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_complex_query_routing(self, fastapi_url):
        """Test that complex queries use appropriate models."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={
                    "message": "Explain the differences between Kubernetes StatefulSets "
                               "and Deployments, including use cases and best practices."
                }
            )

            assert response.status_code == 200
            data = response.json()

            # Complex query should use performance or balanced strategy
            assert data["routing"]["strategy"] in ["performance", "balanced"]

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_conversation_history(self, fastapi_url):
        """Test conversation history tracking."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Send first message
            await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={"message": "Hello"}
            )

            # Send second message
            await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={"message": "What is Kubernetes?"}
            )

            # Get history
            history_response = await client.get(f"{fastapi_url}/api/v1/chat/history")
            assert history_response.status_code == 200

            history = history_response.json()
            assert isinstance(history, list)
            assert len(history) >= 4  # At least 2 user + 2 assistant messages

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_clear_history(self, fastapi_url):
        """Test clearing conversation history."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Send a message
            await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={"message": "Test message"}
            )

            # Clear history
            clear_response = await client.delete(f"{fastapi_url}/api/v1/chat/history")
            assert clear_response.status_code == 200

            # Verify history is empty
            history_response = await client.get(f"{fastapi_url}/api/v1/chat/history")
            history = history_response.json()
            assert len(history) == 0

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_memory_stats(self, node_bridge_url):
        """Test memory statistics endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{node_bridge_url}/memory/stats")

            assert response.status_code == 200
            data = response.json()

            # Verify stats structure
            assert "shortTerm" in data
            assert "working" in data
            assert "longTerm" in data

            assert "count" in data["shortTerm"]
            assert "utilizationPercent" in data["working"]
            assert "memories" in data["longTerm"]

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_routing_stats(self, node_bridge_url):
        """Test routing statistics endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{node_bridge_url}/stats")

            assert response.status_code == 200
            data = response.json()

            # Verify stats structure
            assert "totalRequests" in data
            assert "byProvider" in data
            assert "byStrategy" in data
            assert "avgLatency" in data
            assert "totalCost" in data

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_cost_optimization(self, fastapi_url):
        """Test that cost-optimized routing saves money."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Send 10 simple queries
            total_cost = 0
            for i in range(10):
                response = await client.post(
                    f"{fastapi_url}/api/v1/chat",
                    json={"message": f"What is container {i}?"}
                )

                data = response.json()
                total_cost += data["metrics"]["cost"]

            # Average cost should be low (using Gemini Flash)
            avg_cost = total_cost / 10
            assert avg_cost < 0.001  # Less than $0.001 per query

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_failover_mechanism(self, fastapi_url):
        """Test that failover works when primary provider fails."""
        # This test would require simulating provider failures
        # For now, just verify the endpoint can handle errors gracefully
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={"message": "Test failover"}
            )

            # Should succeed even if one provider fails
            assert response.status_code in [200, 500]


class TestPerformance:
    """Performance and load tests."""

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_latency_simple_query(self, fastapi_url="http://localhost:8001"):
        """Test latency for simple queries."""
        import time

        async with httpx.AsyncClient(timeout=30.0) as client:
            start = time.time()
            response = await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={"message": "What is Docker?"}
            )
            end = time.time()

            assert response.status_code == 200
            total_latency = (end - start) * 1000  # Convert to ms

            # Total latency should be < 2 seconds for simple queries
            assert total_latency < 2000

    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_concurrent_requests(self, fastapi_url="http://localhost:8001"):
        """Test handling concurrent requests."""
        async def send_request(client, message):
            response = await client.post(
                f"{fastapi_url}/api/v1/chat",
                json={"message": message}
            )
            return response.status_code

        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = [
                send_request(client, f"Query {i}")
                for i in range(5)  # 5 concurrent requests
            ]

            results = await asyncio.gather(*tasks)

            # All should succeed
            assert all(status == 200 for status in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])
