from typing import Any

import pytest


class TestLiteLLMAPI:
    """Test LiteLLM API endpoints."""

    def test_list_models(self, client) -> None:
        """Test listing available models."""
        resp = client.get('/v1/models')
        assert resp.status_code == 200
        data = resp.json()
        assert data.get('object') == 'list'
        assert 'data' in data
        assert isinstance(data['data'], list)

    def test_get_providers(self, client) -> None:
        """Test getting provider information."""
        resp = client.get('/v1/providers')
        assert resp.status_code == 200
        data = resp.json()
        assert 'providers' in data
        assert 'total_configured' in data
        assert 'total_available' in data

        # Check that expected providers are present
        providers = data['providers']
        expected_providers = ['openai', 'gemini', 'deepseek']
        for provider in expected_providers:
            assert provider in providers
            assert 'configured' in providers[provider]
            assert isinstance(providers[provider]['configured'], bool)

    def test_chat_completions_missing_model(self, client) -> None:
        """Test chat completions with missing model."""
        payload = {'messages': [{'role': 'user', 'content': 'Hello'}]}
        resp = client.post('/v1/chat/completions', json=payload)
        assert resp.status_code == 422  # Validation error

    def test_chat_completions_invalid_request(self, client) -> None:
        """Test chat completions with invalid request structure."""
        payload = {
            'model': 'gpt-3.5-turbo',
            'messages': [],  # Empty messages
        }
        resp = client.post('/v1/chat/completions', json=payload)
        # LiteLLM handles validation and returns 502 for API errors
        assert resp.status_code in [422, 502]

    @pytest.mark.asyncio
    async def test_chat_completions_mock(self, client, monkeypatch: Any) -> None:
        """Test chat completions with mocked LiteLLM response."""
        from unittest.mock import Mock

        # Mock LiteLLM response
        mock_response = Mock()
        mock_response.id = 'test-id'
        mock_response.created = 1234567890
        mock_response.model = 'gpt-3.5-turbo'
        mock_response.choices = [Mock()]
        mock_response.choices[0].model_dump.return_value = {
            'index': 0,
            'message': {'role': 'assistant', 'content': 'Hello! How can I help you?'},
            'finish_reason': 'stop',
        }
        mock_response.usage = Mock()
        mock_response.usage.model_dump.return_value = {
            'prompt_tokens': 10,
            'completion_tokens': 20,
            'total_tokens': 30,
        }

        # Mock the acompletion function
        async def mock_acompletion(**kwargs: Any) -> Any:
            return mock_response

        monkeypatch.setattr('forge.api.litellm.litellm.acompletion', mock_acompletion)

        payload = {'model': 'gpt-3.5-turbo', 'messages': [{'role': 'user', 'content': 'Hello'}]}
        resp = client.post('/v1/chat/completions', json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data['id'] == 'test-id'
        assert data['model'] == 'gpt-3.5-turbo'
        assert len(data['choices']) == 1
        assert data['usage']['total_tokens'] == 30

    def test_chat_completions_streaming_request(self, client) -> None:
        """Test that streaming requests are accepted (but won't complete without API keys)."""
        payload = {
            'model': 'gpt-3.5-turbo',
            'messages': [{'role': 'user', 'content': 'Hello'}],
            'stream': True,
        }
        # This will likely fail due to missing API keys, but should not be a 422 validation error
        resp = client.post('/v1/chat/completions', json=payload)
        # We expect either success (if API keys are configured) or a 502 error (API failure)
        # but NOT a 422 validation error
        assert resp.status_code in [200, 502]
