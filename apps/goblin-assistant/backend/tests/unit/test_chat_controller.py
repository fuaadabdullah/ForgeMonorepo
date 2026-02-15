import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.chat_controller import ChatController
from backend.services.request_validation import ChatCompletionRequest, ChatMessage


@pytest.mark.asyncio
async def test_orchestrate_completion_successful_routing():
    """Test successful orchestration with routing."""
    controller = ChatController()

    request = ChatCompletionRequest(messages=[ChatMessage(role="user", content="Hello")])

    routing_service = AsyncMock()
    gateway_service = AsyncMock()
    req = MagicMock()

    gateway_result = MagicMock()
    gateway_result.intent.value = "chat"
    gateway_result.estimated_tokens = 10
    gateway_result.risk_score = 0.1
    gateway_result.allowed = True

    routing_result = {
        "success": True,
        "provider": {"model": "test-model"},
        "request_id": "test-123",
        "emergency_mode": False,
    }
    routing_service.route_request = AsyncMock(return_value=routing_result)

    execution_result = {
        "success": True,
        "tokens_used": 15,
        "response_text": "Hello back!",
        "routing_result": routing_result,
        "gateway_result": gateway_result,
    }

    controller._check_gateway_and_prepare = AsyncMock(
        return_value=([{"role": "user", "content": "Hello"}], gateway_result)
    )
    controller._execute_provider_request = AsyncMock(return_value=execution_result)

    with patch(
        "backend.services.config_processor.build_requirements",
        return_value={"test": "requirements"},
    ), patch(
        "backend.services.config_processor.get_client_context",
        return_value=("127.0.0.1", "/test", "user123"),
    ):
        result = await controller.orchestrate_completion(
            request, req, routing_service, gateway_service
        )

    assert result["success"] is True
    assert result["tokens_used"] == 15
    assert result["routing_result"] == routing_result
    assert result["gateway_result"] == gateway_result

    controller._check_gateway_and_prepare.assert_called_once_with(request, gateway_service)
    controller._execute_provider_request.assert_called_once()


@pytest.mark.asyncio
async def test_orchestrate_completion_routing_failure():
    """Test orchestration when routing fails."""
    controller = ChatController()

    request = ChatCompletionRequest(messages=[ChatMessage(role="user", content="Hello")])

    routing_service = AsyncMock()
    gateway_service = AsyncMock()
    req = MagicMock()

    gateway_result = MagicMock()
    gateway_result.allowed = True
    gateway_result.risk_score = 0.5
    gateway_result.intent.value = "chat"
    gateway_result.estimated_tokens = 10

    routing_result = {"success": False, "error": "No provider available"}

    controller._check_gateway_and_prepare = AsyncMock(
        return_value=([{"role": "user", "content": "Hello"}], gateway_result)
    )
    routing_service.route_request = AsyncMock(return_value=routing_result)

    with patch(
        "backend.services.config_processor.build_requirements",
        return_value={"test": "requirements"},
    ), patch(
        "backend.services.config_processor.get_client_context",
        return_value=("127.0.0.1", "/test", "user123"),
    ):
        result = await controller.orchestrate_completion(
            request, req, routing_service, gateway_service
        )

    assert result["success"] is False
    assert result["error"] == "No provider available"
    assert result["routing_result"] == routing_result
    assert result["gateway_result"] == gateway_result


@pytest.mark.asyncio
async def test_execute_local_provider_with_scaling():
    """Test execution of local provider with scaling outcome."""
    controller = ChatController()

    request = MagicMock()
    req = MagicMock()
    routing_result = {"request_id": "test-123", "provider": {"model": "test-model"}}
    messages = [{"role": "user", "content": "Hello"}]
    rag_context = None
    provider_info = {"model": "test-model"}
    selected_model = "test-model"
    temperature = 0.7
    max_tokens = 100
    top_p = 0.9
    adapter = MagicMock()
    provider_metrics_name = "test-provider"

    scaling_outcome = {
        "response_text": "Hello from scaling!",
        "scaling_result": {"scaled": True},
        "response_time_ms": 150,
    }

    record_latency_metric = AsyncMock()

    with patch(
        "backend.services.scaling_processor.process_inference_scaling",
        AsyncMock(return_value=scaling_outcome),
    ), patch(
        "backend.services.response_builder.estimate_tokens",
        return_value=20,
    ), patch(
        "backend.services.response_builder.build_response_data",
        return_value={"response": "data"},
    ), patch(
        "backend.services.utils._record_latency_metric",
        record_latency_metric,
        create=True,
    ):
        result = await controller._execute_local_provider(
            request,
            req,
            routing_result,
            messages,
            rag_context,
            provider_info,
            selected_model,
            temperature,
            max_tokens,
            top_p,
            adapter,
            provider_metrics_name,
        )

    assert result == {"response": "data"}
    record_latency_metric.assert_called_once_with(
        provider_metrics_name, selected_model, 150, 20, True
    )


@pytest.mark.asyncio
async def test_execute_cloud_provider():
    """Test execution of cloud provider."""
    controller = ChatController()

    request = MagicMock()
    routing_result = {"request_id": "test-123", "provider": {"model": "test-model"}}
    messages = [{"role": "user", "content": "Hello"}]
    rag_context = None
    provider_info = {"model": "test-model"}
    selected_model = "test-model"
    temperature = 0.7
    max_tokens = 100
    top_p = 0.9
    adapter = MagicMock()
    provider_metrics_name = "test-provider"
    gateway_result = MagicMock()

    generation_result = ("Hello from cloud!", 200, 25, True)

    with patch(
        "backend.services.verification_processor.process_simple_generation",
        AsyncMock(return_value=generation_result),
    ) as mock_generation, patch(
        "backend.services.response_builder.build_response_data",
        return_value={"response": "cloud_data"},
    ) as mock_build:
        result = await controller._execute_cloud_provider(
            request,
            routing_result,
            messages,
            rag_context,
            provider_info,
            selected_model,
            temperature,
            max_tokens,
            top_p,
            adapter,
            provider_metrics_name,
            gateway_result,
        )

    assert result == {"response": "cloud_data"}
    mock_generation.assert_called_once()
    mock_build.assert_called_once()
