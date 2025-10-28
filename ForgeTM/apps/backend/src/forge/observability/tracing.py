"""
OpenTelemetry configuration for ForgeTM Backend.

Provides distributed tracing for:
- HTTP requests/responses
- LLM provider calls
- Ollama interactions
- Error tracking
- Request duration/latency

Usage:
    from forge.observability.tracing import init_tracing
    init_tracing(app, settings)
"""

import os
from typing import Any

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def init_tracing(
    app: Any, service_name: str = "forgetm-backend", service_version: str = "0.1.0"
) -> None:
    """
    Initialize OpenTelemetry tracing for FastAPI application.

    Args:
        app: FastAPI application instance
        service_name: Name of the service
        service_version: Version of the service
    """
    # Create resource with service information
    resource = Resource(
        attributes={
            SERVICE_NAME: service_name,
            SERVICE_VERSION: service_version,
        }
    )

    # Create tracer provider
    provider = TracerProvider(resource=resource)

    # Configure OTLP exporter
    otlp_endpoint = os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318/v1/traces')
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint)

    # Add batch span processor
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)

    # Set global tracer provider
    trace.set_tracer_provider(provider)

    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)

    # Instrument HTTPX (for calls to Ollama, LiteLLM, etc.)
    HTTPXClientInstrumentor().instrument()

    print(f'[OpenTelemetry] Tracing initialized for {service_name}')
    print(f'[OpenTelemetry] Exporting to {otlp_endpoint}')


def get_tracer(name: str) -> trace.Tracer:
    """
    Get a tracer instance for manual instrumentation.

    Example:
        from forge.observability.tracing import get_tracer

        tracer = get_tracer(__name__)
        with tracer.start_as_current_span("llm_call") as span:
            span.set_attribute("llm.provider", "gemini")
            span.set_attribute("llm.model", "gemini-1.5-pro")
            # ... LLM call logic
    """
    return trace.get_tracer(name)
