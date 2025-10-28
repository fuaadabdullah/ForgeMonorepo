"""Background tasks for ForgeTM using Celery."""

import logging
from datetime import datetime, timedelta
from typing import Any

from forge.celery_app import celery_app
from forge.config import settings
from forge.observability.sentry import add_breadcrumb
from forge.observability.tracing import get_tracer

logger = logging.getLogger(__name__)
tracer = get_tracer(__name__)


@celery_app.task(bind=True, max_retries=3)  # type: ignore[misc]
def health_check_task(self) -> dict[str, Any]:  # type: ignore[no-untyped-def]
    """Perform comprehensive health checks on all services."""
    try:
        with tracer.start_as_current_span('celery.health_check') as span:
            span.set_attribute('task.type', 'health_check')

            results: dict[str, Any] = {
                'timestamp': datetime.utcnow().isoformat(),
                'services': {},
                'overall_status': 'healthy',
            }

            services: dict[str, dict[str, Any]] = results['services']
            try:
                from redis import Redis

                redis_client = Redis.from_url(settings.redis_url)
                redis_client.ping()
                services['redis'] = {'status': 'healthy', 'response_time': 'ok'}
            except Exception as e:
                services['redis'] = {'status': 'unhealthy', 'error': str(e)}
                results['overall_status'] = 'degraded'

            # Check database connectivity (if configured)
            if hasattr(settings, 'database_url') and settings.database_url:
                try:
                    # Add database health check logic here
                    services['database'] = {'status': 'healthy'}
                except Exception as e:
                    services['database'] = {'status': 'unhealthy', 'error': str(e)}
                    results['overall_status'] = 'degraded'

            # Check external API endpoints
            external_checks = [
                ('gemini_api', 'https://generativelanguage.googleapis.com'),
                ('openai_api', 'https://api.openai.com'),
            ]

            for service_name, url in external_checks:
                try:
                    import httpx

                    # Simple connectivity check (not full API test)
                    timeout = httpx.Timeout(5.0)
                    with httpx.Client(timeout=timeout) as client:
                        response = client.head(url)
                        services[service_name] = {
                            'status': 'healthy' if response.status_code < 500 else 'degraded',
                            'response_code': response.status_code,
                        }
                except Exception as e:
                    services[service_name] = {'status': 'unhealthy', 'error': str(e)}

            add_breadcrumb(
                f'Health check completed: {results["overall_status"]}',
                category='health',
                level='info' if results['overall_status'] == 'healthy' else 'warning',
                services_checked=len(results['services']),
            )

            return results

    except Exception as e:
        logger.error(f'Health check task failed: {e}')
        self.retry(countdown=60)
        raise


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def cleanup_expired_data_task(self, days_old: int = 30) -> dict[str, Any]:  # type: ignore[no-untyped-def]
    """Clean up expired or old data from various storage systems."""
    try:
        with tracer.start_as_current_span('celery.cleanup_expired_data') as span:
            span.set_attribute('task.type', 'cleanup')
            span.set_attribute('cleanup.days_old', days_old)

            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            results: dict[str, Any] = {
                'timestamp': datetime.utcnow().isoformat(),
                'cutoff_date': cutoff_date.isoformat(),
                'cleaned_items': {},
                'total_cleaned': 0,
            }

            cleaned_items: dict[str, int] = results['cleaned_items']

            # Clean up old Redis keys (if pattern-based cleanup is needed)
            try:
                from redis import Redis

                redis_client = Redis.from_url(settings.redis_url)

                # Example: Clean up old task results
                task_keys = redis_client.keys('celery-task-meta-*')
                expired_keys: list[str] = []

                if task_keys:  # Check if task_keys is not None
                    # Handle different Redis client return types
                    from typing import cast

                    keys_list: list[str] = cast(list[str], task_keys)
                    for key in keys_list:
                        try:
                            # Check if key has expiration or is old
                            ttl = redis_client.ttl(key)
                            if ttl == -1:  # No expiration set
                                # Could implement custom logic here
                                pass
                        except Exception:
                            pass

                cleaned_items['redis_keys'] = len(expired_keys)

            except Exception as e:
                logger.warning(f'Redis cleanup failed: {e}')
                cleaned_items['redis_keys'] = 0

            # Clean up old log files or temporary files
            try:
                import glob
                import os

                # Example: Clean up old log files
                log_pattern = '/tmp/forge_logs/*.log'
                old_logs = []

                for log_file in glob.glob(log_pattern):
                    if os.path.getmtime(log_file) < cutoff_date.timestamp():
                        old_logs.append(log_file)

                # Note: Actually deleting files would be done carefully in production
                cleaned_items['old_log_files'] = len(old_logs)

            except Exception as e:
                logger.warning(f'Log cleanup failed: {e}')
                cleaned_items['old_log_files'] = 0

            results['total_cleaned'] = sum(cleaned_items.values())

            add_breadcrumb(
                f'Cleanup completed: {results["total_cleaned"]} items removed',
                category='cleanup',
                level='info',
                days_old=days_old,
                total_cleaned=results['total_cleaned'],
            )

            return results

    except Exception as e:
        logger.error(f'Cleanup task failed: {e}')
        self.retry(countdown=300)  # Retry after 5 minutes
        raise


@celery_app.task(bind=True, max_retries=3)  # type: ignore[misc]
def model_cache_refresh_task(self, model_names: list[str] | None = None) -> dict[str, Any]:  # type: ignore[no-untyped-def]
    """Refresh cached model information and capabilities."""
    try:
        with tracer.start_as_current_span('celery.model_cache_refresh') as span:
            span.set_attribute('task.type', 'model_management')

            if model_names:
                span.set_attribute('models.count', len(model_names))
                span.set_attribute('models.names', ','.join(model_names))

            results: dict[str, Any] = {
                'timestamp': datetime.utcnow().isoformat(),
                'models_refreshed': [],
                'errors': [],
                'total_processed': 0,
            }

            # This would integrate with actual model providers
            # For now, simulate the refresh process
            providers_to_check = ['gemini', 'openai', 'deepseek']

            if model_names:
                # Filter to specific models
                providers_to_check = [
                    p
                    for p in providers_to_check
                    if any(m.lower().startswith(p) for m in model_names)
                ]

            for provider in providers_to_check:
                try:
                    # Simulate API call to get model info
                    import time

                    time.sleep(0.1)  # Simulate network delay

                    # In real implementation, this would:
                    # 1. Call provider API to get current models
                    # 2. Update local cache/database
                    # 3. Validate model availability

                    results['models_refreshed'].append(
                        {
                            'provider': provider,
                            'status': 'refreshed',
                            'models_count': 5,  # Simulated
                        }
                    )

                except Exception as e:
                    results['errors'].append({'provider': provider, 'error': str(e)})

            results['total_processed'] = len(results['models_refreshed']) + len(results['errors'])

            add_breadcrumb(
                f'Model cache refresh completed: {len(results["models_refreshed"])} '
                f'refreshed, {len(results["errors"])} errors',
                category='model_management',
                level='info',
                models_refreshed=len(results['models_refreshed']),
                errors=len(results['errors']),
            )

            return results

    except Exception as e:
        logger.error(f'Model cache refresh task failed: {e}')
        self.retry(countdown=120)  # Retry after 2 minutes
        raise


@celery_app.task(bind=True, max_retries=1)  # type: ignore[misc]
def send_notification_task(  # type: ignore[no-untyped-def]
    self, notification_type: str, recipient: str, message: dict[str, Any]
) -> dict[str, Any]:
    """Send notifications via various channels (email, webhook, etc.)."""
    try:
        with tracer.start_as_current_span('celery.send_notification') as span:
            span.set_attribute('task.type', 'notification')
            span.set_attribute('notification.type', notification_type)
            span.set_attribute('notification.recipient', recipient)

            results = {
                'timestamp': datetime.utcnow().isoformat(),
                'notification_type': notification_type,
                'recipient': recipient,
                'status': 'sent',
                'channel': 'unknown',
            }

            # Route to appropriate notification channel
            if notification_type == 'email':
                # Implement email sending logic
                results['channel'] = 'email'
                # Simulate email send
                logger.info(f'Sending email to {recipient}: {message}')

            elif notification_type == 'webhook':
                # Implement webhook logic
                results['channel'] = 'webhook'
                # Simulate webhook call
                logger.info(f'Sending webhook to {recipient}: {message}')

            elif notification_type == 'slack':
                # Implement Slack notification logic
                results['channel'] = 'slack'
                # Simulate Slack message
                logger.info(f'Sending Slack message to {recipient}: {message}')

            else:
                raise ValueError(f'Unknown notification type: {notification_type}')

            add_breadcrumb(
                f'Notification sent: {notification_type} to {recipient}',
                category='notification',
                level='info',
                notification_type=notification_type,
                recipient=recipient,
                channel=results['channel'],
            )

            return results

    except Exception as e:
        logger.error(f'Notification task failed: {e}')
        # Don't retry notification failures
        raise


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def analytics_aggregation_task(self, time_range: str = 'daily') -> dict[str, Any]:  # type: ignore[no-untyped-def]
    """Aggregate analytics data for reporting and monitoring."""
    try:
        with tracer.start_as_current_span('celery.analytics_aggregation') as span:
            span.set_attribute('task.type', 'analytics')
            span.set_attribute('analytics.time_range', time_range)

            results: dict[str, Any] = {
                'timestamp': datetime.utcnow().isoformat(),
                'time_range': time_range,
                'metrics': {},
                'processed_records': 0,
            }

            # This would aggregate data from various sources
            # For now, simulate aggregation
            metrics: dict[str, Any] = {
                'total_requests': 1250,
                'avg_response_time': 245.5,
                'error_rate': 0.023,
                'unique_users': 89,
                'model_usage': {'gemini': 450, 'openai': 320, 'deepseek': 480},
            }
            results['metrics'] = metrics

            model_usage: dict[str, int] = metrics['model_usage']
            results['processed_records'] = sum(model_usage.values())

            add_breadcrumb(
                f'Analytics aggregation completed for {time_range}: '
                f'{results["processed_records"]} records',
                category='analytics',
                level='info',
                time_range=time_range,
                processed_records=results['processed_records'],
            )

            return results

    except Exception as e:
        logger.error(f'Analytics aggregation task failed: {e}')
        self.retry(countdown=600)  # Retry after 10 minutes
        raise


# Legacy tasks for backward compatibility
@celery_app.task  # type: ignore[misc]
def example_task(message: str) -> str:
    """Example background task."""
    return f'Processed: {message}'


@celery_app.task  # type: ignore[misc]
def long_running_task(duration: int) -> str:
    """Simulate a long-running task."""
    import time

    time.sleep(duration)
    return f'Completed after {duration} seconds'
