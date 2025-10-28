# ForgeTM Backend

Welcome to the ForgeTM Backend documentation. This is a production-ready FastAPI-based backend service that provides AI model management and orchestration capabilities.

## Overview

ForgeTM Backend is designed to be a robust, observable, and scalable API service that integrates with multiple AI providers including Ollama for local models and LiteLLM for unified access to cloud-based LLMs.

### Key Features

- **Multi-Provider Support**: Seamless integration with Ollama and LiteLLM
- **Observability**: OpenTelemetry tracing and Sentry error tracking
- **Background Processing**: Celery-based task queue with Redis backend
- **Security**: Container security scanning and secret management
- **Developer Experience**: Comprehensive testing, linting, and documentation

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- uv package manager
- Ollama (optional, for local models)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ForgeMonorepo/ForgeTM/apps/backend

# Install dependencies
uv sync

# Copy environment file
cp .env.example .env

# Run the application
uvicorn forge.main:app --reload
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

## API Documentation

- [Interactive API Docs (Swagger UI)](/docs) - When running locally
- [ReDoc](/redoc) - Alternative API documentation
- [OpenAPI Schema](/openapi.json) - JSON schema for integration

## Architecture

### Core Components

- **FastAPI Application**: Main web framework with automatic OpenAPI generation
- **Provider APIs**: Modular routers for different AI providers
- **Configuration Management**: Pydantic Settings with environment variable support
- **Observability Stack**: OpenTelemetry + Jaeger for tracing, Sentry for error tracking
- **Background Tasks**: Celery with Redis for asynchronous processing

### Data Flow

```text
Client Request → FastAPI → Provider Router → External API
                      ↓
               Observability (Tracing, Metrics)
                      ↓
               Background Tasks (if needed)
```

## Development

### Project Structure

```text
src/forge/
├── main.py              # FastAPI application
├── config.py            # Settings and configuration
├── api/                 # API routers
│   ├── providers.py     # Provider health checks
│   └── ollama.py        # Ollama model management
├── observability/       # Monitoring and tracing
│   ├── tracing.py       # OpenTelemetry setup
│   └── sentry.py        # Error tracking
├── tasks.py             # Background tasks
└── celery_app.py        # Celery configuration
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=forge --cov-report=html

# Run specific test file
pytest tests/test_tasks.py
```

### Code Quality

```bash
# Linting and formatting
ruff check .
ruff format .

# Type checking
mypy src/
```

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Secrets encrypted with SOPS
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] SSL certificates installed

### Docker Production

```bash
# Build production image
docker build -t forge-backend:latest .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://localhost:11434` |
| `LITELLM_PROXY_URL` | LiteLLM proxy endpoint | `http://localhost:4000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing | `false` |
| `SENTRY_DSN` | Sentry DSN for error tracking | - |

See `.env.example` for complete configuration options.

## Monitoring

### Health Endpoints

- `GET /health` - Basic application health
- `GET /providers/health` - Provider-specific health checks

### Tracing

Traces are exported to Jaeger at `http://localhost:16686` when tracing is enabled.

### Error Tracking

Errors are automatically captured and sent to Sentry for analysis and alerting.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.>
