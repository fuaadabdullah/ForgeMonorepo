import httpx

from backend.errors import map_exception_to_problem, ErrorCodes
from backend.gateway_service import TokenBudgetExceeded, MaxTokensExceeded
from backend.providers.circuit_breaker import CircuitBreakerOpen
from backend.providers.bulkhead import BulkheadExceeded


def test_map_token_budget():
    prob = map_exception_to_problem(TokenBudgetExceeded("too many tokens"))
    assert prob.status == 400
    assert prob.code == ErrorCodes.QUOTA_EXCEEDED


def test_map_max_tokens():
    prob = map_exception_to_problem(MaxTokensExceeded("max tokens"))
    assert prob.status == 400
    assert prob.code == ErrorCodes.INVALID_REQUEST


def test_map_circuit_open():
    prob = map_exception_to_problem(CircuitBreakerOpen("open"))
    assert prob.status == 503
    assert prob.code == ErrorCodes.SERVICE_UNAVAILABLE


def test_map_bulkhead():
    prob = map_exception_to_problem(BulkheadExceeded("busy"))
    assert prob.status == 503
    assert prob.code == ErrorCodes.SERVICE_UNAVAILABLE


def test_map_timeout():
    prob = map_exception_to_problem(httpx.TimeoutException("timeout"))
    assert prob.status == 503
    assert prob.code == ErrorCodes.SERVICE_UNAVAILABLE


def test_map_default():
    prob = map_exception_to_problem(RuntimeError("boom"))
    assert prob.status == 500
    assert prob.code == ErrorCodes.INTERNAL_ERROR
