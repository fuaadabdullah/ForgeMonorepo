"""Tests for background tasks."""

import pytest
from unittest.mock import patch, MagicMock

from forge.tasks import (
    health_check_task,
    cleanup_expired_data_task,
    model_cache_refresh_task,
    send_notification_task,
    analytics_aggregation_task,
    example_task,
    long_running_task
)


class TestExampleTasks:
    """Test basic example tasks."""

    def test_example_task(self):
        """Test the example task."""
        result = example_task("test message")
        assert result == "Processed: test message"

    def test_long_running_task(self):
        """Test the long running task."""
        with patch('time.sleep') as mock_sleep:
            result = long_running_task(5)
            mock_sleep.assert_called_once_with(5)
            assert result == "Completed after 5 seconds"


class TestHealthCheckTask:
    """Test health check task."""

    @patch('redis.Redis')
    def test_health_check_task_healthy(self, mock_redis_class):
        """Test health check when all services are healthy."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True
        mock_redis_class.from_url.return_value = mock_redis

        with patch('httpx.Client') as mock_client_class:
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_client.head.return_value = mock_response
            mock_client_class.return_value.__enter__.return_value = mock_client

            result = health_check_task()

            assert result['overall_status'] == 'healthy'
            assert 'redis' in result['services']
            assert result['services']['redis']['status'] == 'healthy'

    @patch('redis.Redis')
    def test_health_check_task_redis_unhealthy(self, mock_redis_class):
        """Test health check when Redis is unhealthy."""
        mock_redis_class.from_url.side_effect = Exception("Connection failed")

        result = health_check_task()

        assert result['overall_status'] == 'degraded'
        assert result['services']['redis']['status'] == 'unhealthy'


class TestCleanupTask:
    """Test cleanup task."""

    @patch('redis.Redis')
    @patch('glob.glob')
    @patch('os.path.getmtime')
    def test_cleanup_expired_data_task(self, mock_getmtime, mock_glob, mock_redis_class):
        """Test cleanup of expired data."""
        # Mock Redis
        mock_redis = MagicMock()
        mock_redis.keys.return_value = ['celery-task-meta-1', 'celery-task-meta-2']
        mock_redis.ttl.return_value = -1  # No expiration
        mock_redis_class.from_url.return_value = mock_redis

        # Mock file system
        mock_glob.return_value = ['/tmp/forge_logs/old.log', '/tmp/forge_logs/new.log']
        mock_getmtime.side_effect = [0, 10000000000]  # First file is old, second is new

        result = cleanup_expired_data_task()

        assert 'cleaned_items' in result
        assert result['total_cleaned'] >= 0


class TestModelCacheRefreshTask:
    """Test model cache refresh task."""

    def test_model_cache_refresh_task_all_providers(self):
        """Test refreshing cache for all providers."""
        result = model_cache_refresh_task()

        assert 'models_refreshed' in result
        assert len(result['models_refreshed']) > 0
        assert result['total_processed'] > 0

    def test_model_cache_refresh_task_specific_models(self):
        """Test refreshing cache for specific models."""
        result = model_cache_refresh_task(['gemini-pro'])

        assert 'models_refreshed' in result
        # Should only process gemini provider
        assert any(m['provider'] == 'gemini' for m in result['models_refreshed'])


class TestNotificationTask:
    """Test notification task."""

    def test_send_notification_email(self):
        """Test sending email notification."""
        message = {'subject': 'Test', 'body': 'Test message'}

        result = send_notification_task('email', 'test@example.com', message)

        assert result['status'] == 'sent'
        assert result['channel'] == 'email'
        assert result['notification_type'] == 'email'

    def test_send_notification_unknown_type(self):
        """Test sending notification with unknown type."""
        message = {'body': 'Test message'}

        with pytest.raises(ValueError, match='Unknown notification type'):
            send_notification_task('unknown', 'test@example.com', message)


class TestAnalyticsAggregationTask:
    """Test analytics aggregation task."""

    def test_analytics_aggregation_task(self):
        """Test analytics aggregation."""
        result = analytics_aggregation_task('daily')

        assert 'metrics' in result
        assert 'total_requests' in result['metrics']
        assert 'model_usage' in result['metrics']
        assert result['processed_records'] > 0
