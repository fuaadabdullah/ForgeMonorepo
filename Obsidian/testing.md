# Testing

This guide covers the testing strategy and practices for ForgeTM Backend.

## Testing Philosophy

ForgeTM Backend follows a comprehensive testing approach:

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test component interactions and external service calls
- **End-to-End Tests**: Test complete user workflows (future)
- **Property-Based Tests**: Test with generated input data using Hypothesis

## Test Structure

```text
tests/
├── __init__.py
├── conftest.py              # Pytest configuration and fixtures
├── test_health.py           # Health endpoint tests
├── test_tasks.py            # Background task tests
├── test_providers.py        # Provider API tests
├── test_ollama.py           # Ollama integration tests
└── integration/             # Integration tests
    ├── test_api_integration.py
    └── test_background_tasks_integration.py
```

## Running Tests

### Basic Test Execution

```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest tests/test_tasks.py

# Run specific test function
uv run pytest tests/test_tasks.py::test_health_check_task

# Run tests matching pattern
uv run pytest -k "health"
```

### Test Coverage

```bash
# Generate coverage report
uv run pytest --cov=forge --cov-report=html

# View HTML report
open htmlcov/index.html

# Coverage with minimum threshold
uv run pytest --cov=forge --cov-fail-under=90
```

### Test Categories

```bash
# Run only unit tests
uv run pytest -m "not integration"

# Run only integration tests
uv run pytest -m integration

# Run only performance tests
uv run pytest -m performance
```

## Writing Tests

### Unit Test Example

```python
import pytest
from forge.tasks import health_check_task


class TestHealthCheckTask:
    """Test cases for health check background task."""

    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check."""
        result = await health_check_task()
        assert result["status"] == "ok"
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_health_check_with_error(self):
        """Test health check with simulated error."""
        # Mock external dependency failure
        with patch("httpx.AsyncClient.get", side_effect=Exception("Connection failed")):
            result = await health_check_task()
            assert result["status"] == "error"
            assert "error" in result
```

### Integration Test Example

```python
import pytest
from httpx import AsyncClient
from forge.main import app


@pytest.mark.integration
class TestAPIIntegration:
    """Integration tests for API endpoints."""

    @pytest.fixture
    async def client(self):
        """Create test client."""
        async with AsyncClient(app=app, base_url="http://testserver") as client:
            yield client

    async def test_health_endpoint(self, client):
        """Test health endpoint returns correct response."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

    async def test_providers_health_endpoint(self, client):
        """Test providers health endpoint."""
        response = await client.get("/providers/health")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert "ollama" in data["providers"]
```

### Property-Based Testing

```python
import pytest
from hypothesis import given, strategies as st
from forge.api.ollama import OllamaModel


class TestOllamaModel:
    """Property-based tests for Ollama model structures."""

    @given(
        name=st.text(min_size=1, max_size=100),
        size=st.integers(min_value=0, max_value=10**12),
        digest=st.one_of(st.none(), st.text(min_size=1, max_size=100))
    )
    def test_ollama_model_creation(self, name, size, digest):
        """Test OllamaModel can be created with various inputs."""
        model = OllamaModel(name=name, size=size, digest=digest)
        assert model.name == name
        assert model.size == size
        assert model.digest == digest
```

## Test Fixtures

### conftest.py

```python
import pytest
import redis
from unittest.mock import AsyncMock
from forge.config import Settings


@pytest.fixture
def settings():
    """Create test settings."""
    return Settings(
        app_env="testing",
        redis_url="redis://localhost:6379/1",  # Separate test database
        enable_tracing=False
    )


@pytest.fixture
async def redis_client(settings):
    """Create Redis client for testing."""
    client = redis.from_url(settings.redis_url)
    yield client
    # Clean up after test
    client.flushdb()


@pytest.fixture
def mock_httpx_client():
    """Mock httpx client for external API calls."""
    with patch("httpx.AsyncClient") as mock_client:
        mock_instance = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_instance
        yield mock_instance
```

## Mocking External Services

### HTTP Client Mocking

```python
from unittest.mock import patch, AsyncMock
import pytest


@pytest.mark.asyncio
async def test_ollama_list_models_success():
    """Test successful Ollama model listing."""
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "models": [
            {"name": "llama2:7b", "size": 3791737152, "digest": "sha256:123"}
        ]
    }

    with patch("httpx.AsyncClient.get", return_value=mock_response) as mock_get:
        from forge.api.ollama import list_models
        models = await list_models()

        assert len(models) == 1
        assert models[0].name == "llama2:7b"
        mock_get.assert_called_once()
```

### Redis Mocking

```python
from unittest.mock import patch
import pytest


@pytest.mark.asyncio
async def test_background_task_with_redis():
    """Test background task that uses Redis."""
    with patch("redis.Redis") as mock_redis:
        mock_client = AsyncMock()
        mock_redis.from_url.return_value = mock_client

        from forge.tasks import some_redis_task
        result = await some_redis_task()

        assert result["status"] == "success"
        mock_client.set.assert_called_with("some_key", "some_value")
```

## Test Configuration

### pytest.ini

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --strict-markers
    --strict-config
    --cov=forge
    --cov-report=term-missing
    --cov-fail-under=90
markers =
    integration: marks tests as integration tests (deselect with '-m "not integration"')
    performance: marks tests as performance tests
    slow: marks tests as slow (deselect with '-m "not slow"')
asyncio_mode = auto
```

### Coverage Configuration

```ini
[coverage:run]
source = forge
omit =
    */tests/*
    */venv/*
    */.venv/*

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379
      ollama:
        image: ollama/ollama:latest
        ports:
          - 11434:11434

    steps:
    - uses: actions/checkout@v4
    - uses: astral-sh/setup-uv@v1
    - run: uv sync
    - run: uv run pytest --cov=forge --cov-report=xml
    - uses: codecov/codecov-action@v3
```

## Performance Testing

### Load Testing with pytest-benchmark

```python
import pytest
from forge.tasks import health_check_task


@pytest.mark.performance
class TestPerformance:
    """Performance tests for critical functions."""

    def test_health_check_performance(self, benchmark):
        """Benchmark health check task performance."""
        result = benchmark(health_check_task)
        assert result["status"] == "ok"
        assert benchmark.stats["mean"] < 1.0  # Should complete in < 1 second
```

### Memory Usage Testing

```python
import pytest
import tracemalloc
from forge.tasks import analytics_aggregation_task


@pytest.mark.performance
class TestMemoryUsage:
    """Memory usage tests."""

    def test_memory_usage_under_limit(self):
        """Ensure task doesn't use excessive memory."""
        tracemalloc.start()
        result = analytics_aggregation_task()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # Assert memory usage is reasonable
        assert peak < 50 * 1024 * 1024  # Less than 50MB
        assert result["status"] == "success"
```

## Test Data Management

### Test Database Isolation

```python
@pytest.fixture(autouse=True)
def isolate_redis_database(settings):
    """Ensure each test uses a separate Redis database."""
    # Use database 1 for tests (configured in settings fixture)
    yield
    # Clean up after each test
    client = redis.from_url(settings.redis_url)
    client.flushdb()
```

### Mock Data Factories

```python
from pydantic import BaseModel


class OllamaModelFactory:
    """Factory for creating test Ollama model data."""

    @staticmethod
    def create_model(name="test-model", size=1000000, digest="sha256:test"):
        """Create a test Ollama model."""
        return {
            "name": name,
            "size": size,
            "digest": digest
        }

    @staticmethod
    def create_models(count=3):
        """Create multiple test models."""
        return [OllamaModelFactory.create_model(f"model-{i}") for i in range(count)]
```

## Debugging Tests

### Verbose Test Output

```bash
# Show all output
uv run pytest -v -s

# Show captured output on failure
uv run pytest --tb=short

# Debug specific test
uv run pytest tests/test_tasks.py::TestHealthCheckTask::test_health_check_success -v -s
```

### PDB Debugging

```python
import pdb; pdb.set_trace()
# Or add to pytest
uv run pytest --pdb
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should describe what they test
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Don't rely on external services
5. **Test Edge Cases**: Include boundary conditions and error cases
6. **Maintain Test Coverage**: Keep coverage above 90%
7. **Fast Tests**: Keep unit tests under 100ms each
8. **Documentation**: Document complex test scenarios
