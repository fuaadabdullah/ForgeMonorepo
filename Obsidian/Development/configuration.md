# Configuration

This guide explains how to configure ForgeTM Backend for different environments and use cases.

## Environment Variables

ForgeTM Backend uses environment variables for all configuration. Copy `.env.example` to `.env` and modify as needed.

### Core Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_ENV` | Environment (development/production) | `development` | No |
| `LOG_LEVEL` | Logging level (DEBUG/INFO/WARNING/ERROR) | `INFO` | No |
| `VERSION` | Application version | `0.1.0` | No |

### Server Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HOST` | Server host | `127.0.0.1` | No |
| `PORT` | Server port | `8000` | No |
| `WORKERS` | Number of workers (production) | `1` | No |

### AI Providers

#### Ollama Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://localhost:11434` | No |
| `OLLAMA_TIMEOUT` | Request timeout in seconds | `30` | No |

#### LiteLLM Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LITELLM_PROXY_URL` | LiteLLM proxy endpoint | `http://localhost:4000` | No |
| `LITELLM_API_KEY` | API key for LiteLLM | - | No |

### Background Tasks (Celery + Redis)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` | Yes* |
| `CELERY_BROKER_URL` | Celery broker URL (usually same as Redis) | Same as REDIS_URL | No |
| `CELERY_RESULT_BACKEND` | Celery result backend | Same as REDIS_URL | No |

*Required when using background tasks

### Observability

#### OpenTelemetry Tracing

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENABLE_TRACING` | Enable OpenTelemetry tracing | `false` | No |
| `OTEL_SERVICE_NAME` | Service name for traces | `forge-backend` | No |
| `OTEL_SERVICE_VERSION` | Service version for traces | `0.1.0` | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP exporter endpoint | `http://localhost:4318` | No |

#### Sentry Error Tracking

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SENTRY_DSN` | Sentry DSN for error reporting | - | No |
| `SENTRY_ENVIRONMENT` | Environment name for Sentry | Same as APP_ENV | No |

## Configuration Files

### .env.example

The repository includes a comprehensive `.env.example` file with all available options and documentation:

```bash
# Application
APP_ENV=development
LOG_LEVEL=INFO
VERSION=0.1.0

# Server
HOST=127.0.0.1
PORT=8000
WORKERS=1

# AI Providers
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=30

LITELLM_PROXY_URL=http://localhost:4000
LITELLM_API_KEY=your_litellm_api_key_here

# Background Tasks
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Observability
ENABLE_TRACING=false
OTEL_SERVICE_NAME=forge-backend
OTEL_SERVICE_VERSION=0.1.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
```

### Docker Compose Override

For local development, you can override settings using `docker-compose.override.yml`:

```yaml
version: '3.8'
services:
  backend:
    environment:
      - LOG_LEVEL=DEBUG
      - ENABLE_TRACING=true
    ports:
      - "8000:8000"
```

## Environment-Specific Configuration

### Development Environment

```bash
# .env
APP_ENV=development
LOG_LEVEL=DEBUG
ENABLE_TRACING=true
OLLAMA_BASE_URL=http://host.docker.internal:11434  # For Docker
```

### Production Environment

```bash
# .env
APP_ENV=production
LOG_LEVEL=INFO
ENABLE_TRACING=true
SENTRY_DSN=https://your-production-dsn@sentry.io/project-id
WORKERS=4
```

### Testing Environment

```bash
# .env.test
APP_ENV=testing
LOG_LEVEL=WARNING
REDIS_URL=redis://localhost:6379/1  # Separate database for tests
```

## Secret Management

### Development

For local development, secrets can be stored in `.env` files (ensure `.env` is in `.gitignore`).

### Production

For production, use your platform's secret management:

- **Docker Swarm**: Docker secrets
- **Kubernetes**: Secrets and ConfigMaps
- **AWS**: Systems Manager Parameter Store or Secrets Manager
- **Azure**: Key Vault
- **GCP**: Secret Manager

### SOPS Encryption

The project supports SOPS for encrypting secrets:

```bash
# Encrypt secrets
sops --encrypt --in-place secrets.yaml

# Decrypt for editing
sops secrets.yaml
```

## Validation

Configuration is validated at startup using Pydantic Settings. Invalid configurations will cause the application to fail fast with clear error messages.

### Common Validation Errors

1. **Invalid URL format**: Ensure URLs include protocol (http:// or https://)
2. **Missing required secrets**: Check that all required environment variables are set
3. **Invalid port numbers**: Ports must be integers between 1-65535
4. **Malformed Redis URLs**: Must follow `redis://host:port/db` format

## Runtime Configuration

Some settings can be changed at runtime without restart:

- Log levels (via environment or API if implemented)
- Feature flags
- Provider endpoints (with caution)

Settings requiring restart:

- Server host/port
- Worker count
- Tracing configuration
- Database connections

## Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** for each environment
3. **Document all environment variables** in README
4. **Validate configuration** at startup
5. **Use descriptive variable names** and values
6. **Group related settings** together
7. **Provide sensible defaults** where possible
