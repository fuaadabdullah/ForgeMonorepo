"""
Example FastAPI application with OpenTelemetry integration.

Shows how to:
1. Initialize tracing for the app
2. Create manual spans for custom operations
3. Add attributes to spans
4. Track errors in spans
"""

from fastapi import FastAPI, HTTPException
from observability.tracing import init_tracing, get_tracer
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

app = FastAPI(title="Overmind API", version="1.0.0")

# Initialize tracing (do this BEFORE defining routes)
init_tracing(app, "overmind-api", "1.0.0")

# Get tracer for manual instrumentation
tracer = get_tracer(__name__)


@app.post("/api/v1/chat")
async def chat(request: dict):
    """
    Chat endpoint with custom span for routing decision.
    """
    # Automatic instrumentation handles HTTP span

    # Create custom span for routing logic
    with tracer.start_as_current_span("routing_decision") as span:
        span.set_attribute("message.length", len(request.get("message", "")))

        try:
            # Simulate routing decision
            strategy = "cost-optimized"
            provider = "gemini"

            span.set_attribute("routing.strategy", strategy)
            span.set_attribute("routing.provider", provider)

            # Create span for LLM call
            with tracer.start_as_current_span("llm_call") as llm_span:
                llm_span.set_attribute("llm.provider", provider)
                llm_span.set_attribute("llm.model", "gemini-1.5-flash")

                # Simulate LLM call
                response_text = "Sample response"

                llm_span.set_attribute("llm.response.length", len(response_text))
                llm_span.set_attribute("llm.tokens", 45)
                llm_span.set_attribute("llm.cost", 0.0002)

            return {
                "response": response_text,
                "provider": provider,
                "routing": {"strategy": strategy}
            }

        except Exception as e:
            # Record exception in span
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Health check endpoint (auto-instrumented)."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
