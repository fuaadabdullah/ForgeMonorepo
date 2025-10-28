# Background Tasks

This guide covers the background task system in ForgeTM Backend, built on Celery with Redis.

## Overview

ForgeTM Backend uses Celery for asynchronous task processing, enabling:

- **Non-blocking operations**: Long-running tasks don't block API responses
- **Reliability**: Tasks survive application restarts
- **Monitoring**: Built-in task tracking and error handling
- **Scalability**: Multiple worker processes for high throughput

## Architecture

### Components

- **Celery App**: Task registry and configuration (`celery_app.py`)
- **Task Definitions**: Business logic tasks (`tasks.py`)
- **Worker Process**: Task execution engine (`celery_worker.py`)
- **Result Backend**: Task result storage (Redis)
- **Message Broker**: Task queuing (Redis)

### Data Flow

```mermaid
graph LR
    A[API Request] --> B[FastAPI Route]
    B --> C[Task.delay()]
    C --> D[Redis Queue]
    D --> E[Worker]
    E --> F[Result Backend]
    F --> G[Response]
```

## Configuration

### Celery App Setup

```python
# src/forge/celery_app.py
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_success, task_failure, task_retry

app = Celery('forge')
app.conf.update(
    broker_url=settings.redis_url,
    result_backend=settings.redis_url,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# Signal handlers for monitoring
@task_prerun.connect
def task_prerun_handler(sender, task_id, task, args, kwargs, **extra):
    logger.info(f"Task {task.name} started", extra={
        'task_id': task_id,
        'task_name': task.name,
        'args': args,
        'kwargs': kwargs
    })

@task_success.connect
def task_success_handler(sender, result, **kwargs):
    logger.info(f"Task {sender.name} completed successfully")

@task_failure.connect
def task_failure_handler(sender, exception, traceback, **kwargs):
    logger.error(f"Task {sender.name} failed: {exception}")
    # Send to Sentry
    capture_exception(exception, task_name=sender.name)
```

### Task Definitions

```python
# src/forge/tasks.py
from forge.celery_app import app
from forge.observability.tracing import get_tracer

tracer = get_tracer(__name__)

@app.task(bind=True, name='health_check')
def health_check_task(self):
    """Perform comprehensive health checks."""
    with tracer.start_as_current_span('health_check_task') as span:
        span.set_attribute('task.type', 'health_check')

        try:
            # Check Redis connectivity
            redis_ok = check_redis()

            # Check external services
            ollama_ok = check_ollama_health()
            litellm_ok = check_litellm_health()

            result = {
                'status': 'ok' if all([redis_ok, ollama_ok, litellm_ok]) else 'degraded',
                'timestamp': datetime.utcnow().isoformat(),
                'checks': {
                    'redis': redis_ok,
                    'ollama': ollama_ok,
                    'litellm': litellm_ok
                }
            }

            span.set_attribute('health.overall_status', result['status'])
            return result

        except Exception as e:
            span.set_attribute('error', True)
            span.set_attribute('error.message', str(e))
            raise self.retry(countdown=60, exc=e)
```

## Task Types

### Health Check Task

```python
@app.task(name='health_check')
def health_check_task():
    """Regular health monitoring of all dependencies."""
    return {
        'redis': check_redis_connection(),
        'ollama': check_ollama_service(),
        'litellm': check_litellm_service(),
        'timestamp': datetime.utcnow().isoformat()
    }
```

**Usage:**

```python
from forge.tasks import health_check_task

# Fire and forget
health_check_task.delay()

# Wait for result
result = health_check_task.delay().get(timeout=30)
```

### Cleanup Task

```python
@app.task(name='cleanup_expired_data')
def cleanup_expired_data_task():
    """Clean up expired cache entries and temporary data."""
    with tracer.start_as_current_span('cleanup_task') as span:
        # Clean Redis expired keys
        cleaned_keys = redis_client.delete(*expired_keys)

        # Clean temporary files
        temp_files_removed = clean_temp_directory()

        span.set_attribute('cleanup.redis_keys', cleaned_keys)
        span.set_attribute('cleanup.temp_files', temp_files_removed)

        return {
            'redis_keys_cleaned': cleaned_keys,
            'temp_files_removed': temp_files_removed
        }
```

### Model Cache Refresh Task

```python
@app.task(name='model_cache_refresh')
def model_cache_refresh_task():
    """Refresh cached model information from providers."""
    with tracer.start_as_current_span('cache_refresh') as span:
        # Update Ollama model cache
        ollama_models = fetch_ollama_models()
        cache.set('ollama_models', ollama_models, ttl=3600)

        # Update LiteLLM model cache
        litellm_models = fetch_litellm_models()
        cache.set('litellm_models', litellm_models, ttl=3600)

        span.set_attribute('cache.models_cached', len(ollama_models) + len(litellm_models))

        return {
            'ollama_models': len(ollama_models),
            'litellm_models': len(litellm_models),
            'cached_at': datetime.utcnow().isoformat()
        }
```

### Notification Task

```python
@app.task(name='send_notification', bind=True)
def send_notification_task(self, user_id: str, message: str, channel: str = 'email'):
    """Send notifications to users."""
    with tracer.start_as_current_span('send_notification') as span:
        span.set_attribute('notification.user_id', user_id)
        span.set_attribute('notification.channel', channel)

        try:
            if channel == 'email':
                send_email(user_id, message)
            elif channel == 'webhook':
                send_webhook(user_id, message)
            else:
                raise ValueError(f"Unsupported channel: {channel}")

            span.set_attribute('notification.success', True)
            return {'status': 'sent', 'channel': channel}

        except Exception as e:
            span.set_attribute('notification.success', False)
            span.set_attribute('error.message', str(e))

            # Retry with exponential backoff
            raise self.retry(countdown=min(300, 2 ** self.request.retries), exc=e)
```

### Analytics Aggregation Task

```python
@app.task(name='analytics_aggregation')
def analytics_aggregation_task():
    """Aggregate usage analytics for reporting."""
    with tracer.start_as_current_span('analytics_aggregation') as span:
        # Aggregate request metrics
        request_stats = aggregate_request_metrics()

        # Aggregate model usage
        model_stats = aggregate_model_usage()

        # Store aggregated data
        store_analytics_data(request_stats, model_stats)

        span.set_attribute('analytics.requests_processed', request_stats['total'])
        span.set_attribute('analytics.models_used', len(model_stats))

        return {
            'requests': request_stats,
            'models': model_stats,
            'aggregated_at': datetime.utcnow().isoformat()
        }
```

## Running Workers

### Development

```bash
# Start worker with info logging
uv run celery worker -A forge.celery_app --loglevel=info

# Start worker with beat scheduler
uv run celery worker -A forge.celery_app --loglevel=info --beat

# Start multiple workers
uv run celery worker -A forge.celery_app --loglevel=info --concurrency=4
```

### Production

```bash
# Using the worker script
uv run python celery_worker.py

# Or directly
celery worker -A forge.celery_app --loglevel=warning --concurrency=8
```

### Worker Script

```python
# celery_worker.py
#!/usr/bin/env python3
import os
import signal
import sys
from forge.celery_app import app
from forge.config import settings


def start_worker():
    """Start Celery worker with proper configuration."""
    worker = app.Worker(
        loglevel=settings.log_level.lower(),
        concurrency=settings.celery_concurrency,
        hostname=f'forge-worker@{settings.app_env}',
    )
    worker.start()


def start_beat():
    """Start Celery beat scheduler."""
    beat = app.Beat(
        loglevel=settings.log_level.lower(),
        hostname=f'forge-beat@{settings.app_env}',
    )
    beat.start()


def check_health():
    """Check worker health."""
    inspect = app.control.inspect()
    active = inspect.active()
    stats = inspect.stats()

    return {
        'active_tasks': active,
        'worker_stats': stats,
        'timestamp': datetime.utcnow().isoformat()
    }


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'beat':
        start_beat()
    elif len(sys.argv) > 1 and sys.argv[1] == 'health':
        import json
        print(json.dumps(check_health()))
    else:
        start_worker()
```

## Monitoring Tasks

### Task States

- **PENDING**: Task waiting in queue
- **STARTED**: Task being processed
- **RETRY**: Task failed and scheduled for retry
- **FAILURE**: Task failed permanently
- **SUCCESS**: Task completed successfully

### Monitoring Commands

```bash
# Check active tasks
celery inspect active

# Check registered tasks
celery inspect registered

# Check worker stats
celery inspect stats

# Check queue length
celery inspect active_queues
```

### Flower Dashboard

```bash
# Install Flower
pip install flower

# Start dashboard
celery flower -A forge.celery_app --address=127.0.0.1 --port=5555

# Open http://localhost:5555
```

## Error Handling

### Automatic Retries

```python
@app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3})
def unreliable_task(self):
    """Task that automatically retries on any exception."""
    try:
        # Risky operation
        return do_something_risky()
    except Exception as exc:
        logger.warning(f"Task failed, retrying: {exc}")
        raise self.retry(countdown=60 * (2 ** self.request.retries))
```

### Custom Retry Logic

```python
@app.task(bind=True)
def smart_retry_task(self):
    """Task with intelligent retry logic."""
    try:
        result = call_external_api()
        return result
    except ConnectionError as exc:
        # Retry immediately for connection issues
        raise self.retry(countdown=5, exc=exc)
    except RateLimitError as exc:
        # Exponential backoff for rate limits
        raise self.retry(countdown=60 * (2 ** self.request.retries), exc=exc)
    except AuthenticationError as exc:
        # Don't retry auth failures
        logger.error(f"Authentication failed: {exc}")
        raise
```

### Dead Letter Queue

```python
# Configure dead letter exchange
app.conf.task_reject_on_worker_lost = True
app.conf.task_acks_late = True
app.conf.worker_prefetch_multiplier = 1

# Handle task failures
@task_failure.connect
def handle_task_failure(sender, task_id, exception, args, kwargs, traceback, einfo, **extra):
    """Handle permanent task failures."""
    logger.error(f"Task {sender.name} permanently failed: {exception}")

    # Send to dead letter queue or alert
    send_to_dead_letter_queue(task_id, sender.name, args, kwargs, str(exception))
```

## Testing Background Tasks

### Unit Testing

```python
import pytest
from unittest.mock import patch, AsyncMock
from forge.tasks import health_check_task


@pytest.mark.asyncio
class TestHealthCheckTask:
    """Test health check background task."""

    @patch('forge.tasks.check_redis')
    @patch('forge.tasks.check_ollama_health')
    @patch('forge.tasks.check_litellm_health')
    async def test_health_check_success(self, mock_litellm, mock_ollama, mock_redis):
        """Test successful health check."""
        # Setup mocks
        mock_redis.return_value = True
        mock_ollama.return_value = True
        mock_litellm.return_value = True

        # Execute task
        result = await health_check_task()

        # Assertions
        assert result['status'] == 'ok'
        assert result['checks']['redis'] is True
        assert result['checks']['ollama'] is True
        assert result['checks']['litellm'] is True
        assert 'timestamp' in result
```

### Integration Testing

```python
@pytest.mark.integration
class TestTaskIntegration:
    """Integration tests for background tasks."""

    async def test_task_execution_flow(self, celery_worker):
        """Test complete task execution flow."""
        # Submit task
        result = health_check_task.delay()

        # Wait for completion
        assert result.get(timeout=30)['status'] == 'ok'

        # Check task metadata
        assert result.state == 'SUCCESS'
        assert result.result is not None
```

### Testing Fixtures

```python
# conftest.py
@pytest.fixture(scope='session')
def celery_config():
    """Configure Celery for testing."""
    return {
        'broker_url': 'redis://localhost:6379/1',  # Test database
        'result_backend': 'redis://localhost:6379/1',
        'task_always_eager': True,  # Execute tasks synchronously
        'task_eager_propagates': True,
    }


@pytest.fixture(scope='session')
def celery_worker(celery_config):
    """Start Celery worker for integration tests."""
    from celery.contrib.testing.worker import start_worker
    app.conf.update(**celery_config)
    with start_worker(app):
        yield
```

## Performance Considerations

### Task Chunking

```python
@app.task
def process_batch_task(items, batch_size=100):
    """Process items in chunks to avoid memory issues."""
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        process_batch(batch)
        # Allow other tasks to run
        time.sleep(0.01)
```

### Resource Limits

```python
# Limit concurrent tasks per worker
app.conf.worker_max_tasks_per_child = 1000

# Limit task execution time
@app.task(time_limit=300, soft_time_limit=270)
def long_running_task():
    """Task with time limits."""
    # Task implementation
    pass
```

### Monitoring Performance

```python
# Track task execution time
@task_prerun.connect
def track_task_start(sender, task_id, **kwargs):
    redis.set(f"task:{task_id}:start", time.time())

@task_postrun.connect
def track_task_end(sender, task_id, **kwargs):
    start_time = redis.get(f"task:{task_id}:start")
    if start_time:
        duration = time.time() - float(start_time)
        # Store metrics
        record_task_duration(sender.name, duration)
```

## Deployment

### Docker Configuration

```dockerfile
# Worker container
FROM python:3.11-slim

WORKDIR /app
COPY requirements*.txt ./
RUN pip install -r requirements-worker.txt

COPY . .
CMD ["celery", "worker", "-A", "forge.celery_app", "--loglevel=info"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: forge-worker
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: worker
        image: forge-backend:latest
        command: ["celery", "worker", "-A", "forge.celery_app", "--loglevel=info"]
        envFrom:
        - configMapRef:
            name: forge-config
        - secretRef:
            name: forge-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Best Practices

1. **Idempotent Tasks**: Tasks should be safe to run multiple times
2. **Error Handling**: Always handle exceptions appropriately
3. **Monitoring**: Monitor task success rates and execution times
4. **Resource Limits**: Set appropriate timeouts and resource limits
5. **Testing**: Test both success and failure scenarios
6. **Logging**: Include sufficient context in task logs
7. **Retries**: Use exponential backoff for retries
8. **Cleanup**: Clean up resources after task completion
9. **Documentation**: Document task parameters and return values
10. **Versioning**: Consider task versioning for API compatibility
