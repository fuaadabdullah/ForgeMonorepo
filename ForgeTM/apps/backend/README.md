# ForgeTM Backend

FastAPI backend exposing unified LLM API endpoints via LiteLLM proxy for multiple AI providers (OpenAI, Gemini, DeepSeek).

## Endpoints

- GET `/health` — basic service health
- GET `/providers/health` — health checks for configured AI providers
- GET `/v1/models` — list available models from all configured providers
- POST `/v1/chat/completions` — unified chat completions API (OpenAI-compatible)
- GET `/v1/providers` — provider configuration status

## Environment Setup

### Prerequisites

- Python 3.11+
- API keys for supported providers (see below)

### API Keys Required

Configure the following API keys in `apps/backend/.env`:

```bash
# Required API keys
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
POLYGON_API_KEY=...  # Optional, for financial market data
```

See `ForgeMonorepo/Obsidian/API_KEYS_MANAGEMENT.md` for detailed key management instructions.

### Installation

```bash
# Create virtual environment
cd apps/backend
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e .
# Or for development dependencies:
pip install -e ".[dev]"
```

## Run locally

This repo uses VS Code tasks for orchestration. From the workspace Tasks, run the `ForgeTM:backend:run` task.

If you prefer a manual run, activate your venv and run uvicorn:

```bash
. .venv/bin/activate
uvicorn forge.main:app --reload --host 127.0.0.1 --port 8000
```

## API Documentation

Once running, visit:

- **Interactive API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Alternative Docs**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

## Testing

```bash
# Run all tests
pytest -q

# Run with coverage
pytest --cov=forge --cov-report=html

# Run specific test file
pytest tests/test_litellm.py -v
```

## Supported Providers

The backend integrates with multiple LLM providers through LiteLLM:

- **OpenAI**: GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Google Gemini**: Gemini Pro, Gemini Pro Vision
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder

## Configuration

Environment variables are loaded from `apps/backend/.env`. Copy from `.env.example`:

```bash
cp .env.example .env
# Edit .env with your API keys
```

## Observability

The backend includes:

- **OpenTelemetry tracing** (exported to OTLP endpoint)
- **Sentry error tracking** (optional)
- **Structured logging** with configurable levels

## Development

### Code Quality

```bash
# Format code
ruff format .

# Lint code
ruff check . --fix

# Type checking
mypy src/
```

### Adding New Endpoints

1. Add route to appropriate router in `src/forge/api/`
2. Update tests in `tests/`
3. Update API documentation
4. Add to OpenAPI schema if needed

## Production Deployment

For production deployment:

1. Use secure secret management (AWS Secrets Manager, Azure Key Vault, etc.)
2. Configure proper CORS settings
3. Add authentication/authorization
4. Set up monitoring and alerting
5. Configure rate limiting

### Environment Configuration

#### Required Environment Variables

```bash
# API Keys (use secure secret management in production)
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...

# Application Settings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
LOG_LEVEL=INFO

# Security
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32

# Observability
OTEL_SERVICE_NAME=forgetm-backend
OTEL_SERVICE_VERSION=0.1.0
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-endpoint:4318/v1/traces
ENABLE_TRACING=true

# Sentry (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production
ENABLE_SENTRY=true
```

#### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .
# Or for development: pip install --no-cache-dir -e ".[dev]"

# Copy application
COPY src/ ./src/

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "forge.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Kubernetes Deployment

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: forgetm-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: forgetm-backend
  template:
    metadata:
      labels:
        app: forgetm-backend
    spec:
      containers:
      - name: backend
        image: your-registry/forgetm-backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: forgetm-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Security Considerations

- **API Keys**: Never store in code or version control
- **HTTPS**: Always use HTTPS in production
- **CORS**: Configure appropriate CORS policies
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **Authentication**: Add proper authentication/authorization
- **Secrets Management**: Use dedicated secret management services
- **Monitoring**: Enable comprehensive logging and monitoring

### Scaling Considerations

- **Horizontal Scaling**: Stateless design supports multiple replicas
- **Load Balancing**: Use Kubernetes Service or load balancer
- **Resource Limits**: Set appropriate CPU/memory limits
- **Health Checks**: Implement proper liveness/readiness probes
- **Metrics**: Monitor response times, error rates, and resource usage

## Notes

- Do not hardcode credentials or URLs. Always read from environment variables.
- When adding new env vars, update `apps/backend/.env.example` and reference the API keys documentation.
- All API keys are loaded from environment variables at startup - ensure they are properly configured before running.
