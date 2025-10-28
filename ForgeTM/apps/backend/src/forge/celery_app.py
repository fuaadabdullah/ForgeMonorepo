"""Celery application configuration for background task processing."""

from celery import Celery  # type: ignore
from celery.signals import (  # type: ignore
    task_failure,
    task_postrun,
    task_prerun,
    task_retry,
    task_success,
)

from forge.config import settings
from forge.observability.sentry import add_breadcrumb, capture_exception
from forge.observability.tracing import get_tracer

# Create Celery app
celery_app = Celery(
    'forge', broker=settings.redis_url, backend=settings.redis_url, include=['forge.tasks']
)

# Configure Celery
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    # Task execution
    task_acks_late=True,  # Tasks acknowledged after completion
    worker_prefetch_multiplier=1,  # Disable prefetching for better load balancing
    task_default_retry_delay=60,  # Default retry delay (1 minute)
    task_max_retries=3,  # Default max retries
    # Result backend
    result_expires=3600,  # Results expire after 1 hour
    result_cache_max=10000,  # Max cached results
    # Worker settings
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    worker_disable_rate_limits=False,
    # Monitoring and logging
    worker_send_task_events=True,  # Enable task events for monitoring
    task_send_sent_event=True,  # Send task-sent events
    task_ignore_result=False,  # Store task results
    # Custom settings
    broker_connection_retry_on_startup=True,  # Retry broker connection on startup
)

# Get tracer for distributed tracing
tracer = get_tracer(__name__)


# Celery signal handlers for monitoring and error tracking
@task_prerun.connect  # type: ignore[misc]
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw) -> None:  # type: ignore[no-untyped-def]
    """Handle task pre-run events."""
    if not task:
        return

    with tracer.start_as_current_span(f'celery.task.{task.name}') as span:
        span.set_attribute('celery.task_id', task_id or 'unknown')
        span.set_attribute('celery.task_name', task.name)
        span.set_attribute('celery.args_count', len(args) if args else 0)
        span.set_attribute('celery.kwargs_count', len(kwargs) if kwargs else 0)

        # Add breadcrumb for debugging
        add_breadcrumb(
            f'Starting Celery task: {task.name}',
            category='celery',
            level='info',
            task_id=task_id or 'unknown',
            task_name=task.name,
        )


@task_postrun.connect  # type: ignore[misc]
def task_postrun_handler(  # type: ignore[no-untyped-def]
    sender=None, task_id=None, task=None, retval=None, state=None, **kw
) -> None:
    """Handle task post-run events."""
    if not task:
        return

    with tracer.start_as_current_span(f'celery.task_complete.{task.name}') as span:
        span.set_attribute('celery.task_id', task_id or 'unknown')
        span.set_attribute('celery.task_name', task.name)
        span.set_attribute('celery.state', state or 'unknown')

        # Add breadcrumb for task completion
        add_breadcrumb(
            f'Celery task completed: {task.name} ({state})',
            category='celery',
            level='info',
            task_id=task_id or 'unknown',
            task_name=task.name,
            state=state or 'unknown',
        )


@task_success.connect  # type: ignore[misc]
def task_success_handler(sender=None, result=None, **kw) -> None:  # type: ignore[no-untyped-def]
    """Handle successful task completion."""
    task = sender
    if not task:
        return

    with tracer.start_as_current_span(f'celery.task_success.{task.name}') as span:
        span.set_attribute('celery.task_name', task.name)
        span.set_attribute('celery.success', True)


@task_failure.connect  # type: ignore[misc]
def task_failure_handler(  # type: ignore[no-untyped-def]
    sender=None,
    task_id=None,
    exception=None,
    args=None,
    kwargs=None,
    traceback=None,
    einfo=None,
    **kw,
) -> None:
    """Handle task failure events."""
    task = sender
    if not task or not exception:
        return

    with tracer.start_as_current_span(f'celery.task_failure.{task.name}') as span:
        span.set_attribute('celery.task_id', task_id or 'unknown')
        span.set_attribute('celery.task_name', task.name)
        span.set_attribute('celery.exception', str(exception))

        # Capture exception in Sentry
        capture_exception(
            exception, task_name=task.name, task_id=task_id or 'unknown', args=args, kwargs=kwargs
        )

        # Add breadcrumb for debugging
        add_breadcrumb(
            f'Celery task failed: {task.name} - {str(exception)}',
            category='celery',
            level='error',
            task_id=task_id or 'unknown',
            task_name=task.name,
            exception=str(exception),
        )


@task_retry.connect  # type: ignore[misc]
def task_retry_handler(sender=None, reason=None, **kw) -> None:  # type: ignore[no-untyped-def]
    """Handle task retry events."""
    task = sender
    if not task:
        return

    with tracer.start_as_current_span(f'celery.task_retry.{task.name}') as span:
        span.set_attribute('celery.task_name', task.name)
        span.set_attribute('celery.retry_reason', str(reason) if reason else 'unknown')

        # Add breadcrumb for retry
        add_breadcrumb(
            f'Celery task retry: {task.name} - {str(reason) if reason else "unknown"}',
            category='celery',
            level='warning',
            task_name=task.name,
            retry_reason=str(reason) if reason else 'unknown',
        )


# Health check function for monitoring
def get_celery_stats() -> dict:
    """Get Celery worker and task statistics."""
    inspect = celery_app.control.inspect()

    stats = {
        'active_tasks': inspect.active() or {},
        'scheduled_tasks': inspect.scheduled() or {},
        'reserved_tasks': inspect.reserved() or {},
        'registered_tasks': inspect.registered() or {},
        'stats': inspect.stats() or {},
    }

    return stats


# Utility function to check if Celery is healthy
def is_celery_healthy() -> bool:
    """Check if Celery workers are available and responsive."""
    try:
        inspect = celery_app.control.inspect()
        active = inspect.active()
        return active is not None and len(active) > 0
    except Exception:
        return False
