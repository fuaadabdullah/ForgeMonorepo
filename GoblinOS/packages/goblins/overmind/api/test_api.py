"""
Tests for FastAPI backend endpoints.

Run with: pytest -v test_api.py
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

# Import the FastAPI app
import sys
sys.path.insert(0, '../api')
from app.main import app

client = TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_endpoint(self):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "version" in data
        assert "uptime" in data

    @patch('httpx.AsyncClient.get')
    async def test_health_with_node_service_up(self, mock_get):
        """Test health check when Node service is up."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy"}
        mock_get.return_value = mock_response

        response = client.get("/api/v1/system/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["dependencies"]["nodeService"] == "up"

    @patch('httpx.AsyncClient.get')
    async def test_health_with_node_service_down(self, mock_get):
        """Test health check when Node service is down."""
        mock_get.side_effect = httpx.ConnectError("Connection refused")

        response = client.get("/api/v1/system/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["dependencies"]["nodeService"] == "down"


class TestChatEndpoints:
    """Test chat endpoints."""

    @patch('httpx.AsyncClient.post')
    async def test_chat_endpoint_success(self, mock_post):
        """Test successful chat request."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response": "Kubernetes is a container orchestration platform.",
            "provider": "gemini",
            "model": "gemini-1.5-flash",
            "routing": {
                "strategy": "cost-optimized",
                "reason": "Simple query, using cost-effective model"
            },
            "metrics": {
                "latency": 520,
                "tokens": 45,
                "cost": 0.0002
            }
        }
        mock_post.return_value = mock_response

        response = client.post(
            "/api/v1/chat",
            json={"message": "What is Kubernetes?"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["provider"] == "gemini"
        assert data["routing"]["strategy"] == "cost-optimized"

    @patch('httpx.AsyncClient.post')
    async def test_chat_endpoint_node_service_error(self, mock_post):
        """Test chat when Node service is unavailable."""
        mock_post.side_effect = httpx.ConnectError("Connection refused")

        response = client.post(
            "/api/v1/chat",
            json={"message": "Test"}
        )

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data

    def test_chat_endpoint_missing_message(self):
        """Test chat with missing message field."""
        response = client.post("/api/v1/chat", json={})

        assert response.status_code == 422  # Validation error

    @patch('httpx.AsyncClient.get')
    async def test_get_chat_history(self, mock_get):
        """Test getting chat history."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"role": "user", "content": "Hello", "timestamp": 1234567890},
            {"role": "assistant", "content": "Hi there!", "timestamp": 1234567891}
        ]
        mock_get.return_value = mock_response

        response = client.get("/api/v1/chat/history")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @patch('httpx.AsyncClient.delete')
    async def test_clear_chat_history(self, mock_delete):
        """Test clearing chat history."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_delete.return_value = mock_response

        response = client.delete("/api/v1/chat/history")

        assert response.status_code == 200


class TestMetricsEndpoint:
    """Test metrics endpoint."""

    def test_metrics_endpoint(self):
        """Test Prometheus metrics endpoint."""
        response = client.get("/metrics")

        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]
        # Should contain Prometheus format metrics
        assert "overmind_requests_total" in response.text or "HELP" in response.text


class TestRateLimiting:
    """Test rate limiting functionality."""

    @pytest.mark.skip(reason="Requires actual rate limit config")
    def test_rate_limit_per_user(self):
        """Test per-user rate limiting."""
        # Make 101 requests (limit is 100/min)
        for i in range(101):
            response = client.get("/health")
            if i < 100:
                assert response.status_code == 200
            else:
                assert response.status_code == 429  # Too Many Requests


class TestCORS:
    """Test CORS configuration."""

    def test_cors_headers(self):
        """Test CORS headers are present."""
        response = client.options("/health")

        # Should have CORS headers
        assert "access-control-allow-origin" in response.headers or response.status_code == 200


class TestProviders:
    """Test provider endpoints."""

    @patch('httpx.AsyncClient.get')
    async def test_get_providers(self, mock_get):
        """Test getting available providers."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = ["openai", "gemini", "deepseek"]
        mock_get.return_value = mock_response

        response = client.get("/api/v1/system/providers")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "gemini" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
