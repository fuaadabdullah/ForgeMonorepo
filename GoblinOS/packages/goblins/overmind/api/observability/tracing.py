"""
OpenTelemetry configuration for FastAPI backend.

Provides distributed tracing for:
- HTTP requests/responses
- Proxy calls to Node bridge
- Error tracking
- Request duration/latency

Usage:
    from observability.tracing import init_tracing
    init_tracing(app, "overmind-api")
"""

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
import os


def init_tracing(app, service_name: str = "overmind-api", service_version: str = "1.0.0"):
    """
    Initialize OpenTelemetry tracing for FastAPI application.

    Args:
        app: FastAPI application instance
        service_name: Name of the service
        service_version: Version of the service
    """
    # Create resource with service information
    resource = Resource(attributes={
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
    })

    # Create tracer provider
    provider = TracerProvider(resource=resource)

    # Configure OTLP exporter
    otlp_endpoint = os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "http://localhost:4318/v1/traces"
    )
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint)

    # Add batch span processor
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)

    # Set global tracer provider
    trace.set_tracer_provider(provider)

    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)

    # Instrument HTTPX (for calls to Node bridge)
    HTTPXClientInstrumentor().instrument()

    print(f"[OpenTelemetry] Tracing initialized for {service_name}")
    print(f"[OpenTelemetry] Exporting to {otlp_endpoint}")


def get_tracer(name: str):
    """
    Get a tracer instance for manual instrumentation.

    Example:
        from observability.tracing import get_tracer

        tracer = get_tracer(__name__)
        with tracer.start_as_current_span("process_request") as span:
            span.set_attribute("user.id", user_id)
            # ... processing logic
    """
    return trace.get_tracer(name)
