"""Sentry error tracking and performance monitoring initialization."""

from typing import Any, Literal

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration

from ..config import settings


def init_sentry() -> None:
    """Initialize Sentry error tracking and performance monitoring.

    This function configures Sentry with FastAPI integration, performance monitoring,
    and proper environment settings. It only initializes if Sentry is enabled and
    a DSN is provided.

    See ForgeMonorepo/Obsidian/API_KEYS_MANAGEMENT.md for Sentry DSN configuration.
    """
    if not settings.enable_sentry or not settings.sentry_dsn:
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        release=settings.sentry_release,
        # Performance monitoring
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profiles_sample_rate=settings.sentry_profiles_sample_rate,
        # Integrations
        integrations=[
            FastApiIntegration(
                transaction_style="endpoint",
            ),
            HttpxIntegration(),
        ],
        # Error tracking configuration
        before_send=before_send,
        before_breadcrumb=before_breadcrumb,
        # Performance monitoring
        enable_tracing=True,
        # Context
        send_default_pii=False,  # Don't send personally identifiable information
        server_name=None,  # Let Sentry infer from environment
    )


def before_send(event: Any, hint: Any) -> Any:
    """Filter and modify events before sending to Sentry.

    Args:
        event: The event dictionary
        hint: Additional context about the event

    Returns:
        Modified event or None to drop the event
    """
    # Don't send events in test environment unless explicitly configured
    if settings.sentry_environment == 'test' and not settings.sentry_dsn:
        return None

    # Add custom tags
    if 'tags' not in event:
        event['tags'] = {}

    event['tags'].update({
        'service': 'forgetm-backend',
        'version': settings.version,
    })

    # Add user context if available (without PII)
    if 'user' not in event:
        event['user'] = {}

    event['user'].update({
        'id': 'anonymous',  # Could be enhanced with actual user ID
    })

    return event


def before_breadcrumb(breadcrumb: Any, hint: Any) -> Any:
    """Filter and modify breadcrumbs before adding to events.

    Args:
        breadcrumb: The breadcrumb dictionary
        hint: Additional context about the breadcrumb

    Returns:
        Modified breadcrumb or None to drop the breadcrumb
    """
    # Filter out sensitive breadcrumbs
    if breadcrumb.get('category') == 'http':
        url = breadcrumb.get('data', {}).get('url', '')
        # Don't log API keys or sensitive URLs
        if any(sensitive in url.lower() for sensitive in ['api_key', 'token', 'secret']):
            return None

    return breadcrumb


def capture_exception(exc: Exception, **kwargs: Any) -> None:
    """Capture an exception with additional context.

    Args:
        exc: The exception to capture
        **kwargs: Additional context to include
    """
    if not settings.enable_sentry:
        return

    # Add custom context
    with sentry_sdk.configure_scope() as scope:
        for key, value in kwargs.items():
            scope.set_context(key, value)

        sentry_sdk.capture_exception(exc)


def capture_message(
    message: str,
    level: Literal['fatal', 'critical', 'error', 'warning', 'info', 'debug'] = 'info',
    **kwargs: Any
) -> None:
    """Capture a custom message.

    Args:
        message: The message to capture
        level: The log level ('fatal', 'error', 'warning', 'info', 'debug')
        **kwargs: Additional context to include
    """
    if not settings.enable_sentry:
        return

    # Add custom context
    with sentry_sdk.configure_scope() as scope:
        for key, value in kwargs.items():
            scope.set_context(key, value)

        sentry_sdk.capture_message(message, level=level)


def set_user_context(user_id: str | None = None, **kwargs: Any) -> None:
    """Set user context for error tracking.

    Args:
        user_id: Optional user identifier
        **kwargs: Additional user context
    """
    if not settings.enable_sentry:
        return

    with sentry_sdk.configure_scope() as scope:
        if user_id:
            scope.user = {'id': user_id, **kwargs}
        else:
            scope.user = kwargs


def add_breadcrumb(
    message: str, category: str = 'custom', level: str = 'info', **kwargs: Any
) -> None:
    """Add a breadcrumb for debugging.

    Args:
        message: The breadcrumb message
        category: The breadcrumb category
        level: The breadcrumb level
        **kwargs: Additional breadcrumb data
    """
    if not settings.enable_sentry:
        return

    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=kwargs
    )
