# Getting Started

This guide will help you get ForgeTM Backend up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+**: The backend requires Python 3.11 or higher
- **uv**: Modern Python package manager for fast dependency management
- **Docker & Docker Compose**: For containerized development and deployment
- **Git**: For version control

### Optional Dependencies

- **Ollama**: For local AI model hosting
- **Redis**: For background task queuing (automatically provided via Docker)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ForgeMonorepo/ForgeTM/apps/backend
```

### 2. Install Dependencies

```bash
# Install Python dependencies
uv sync

# Verify installation
uv run python -c "import forge; print('Installation successful')"
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file with your settings
# At minimum, you'll need to configure:
# - OLLAMA_BASE_URL (if using Ollama)
# - LITELLM_PROXY_URL (if using LiteLLM)
# - REDIS_URL (for background tasks)
```

### 4. Start Development Services

```bash
# Start Redis and other services
docker-compose up -d redis

# Or start all services
docker-compose up -d
```

### 5. Run the Application

```bash
# Development mode with auto-reload
uvicorn forge.main:app --reload --host 127.0.0.1 --port 8000

# Or using uv
uv run uvicorn forge.main:app --reload
```

## Verification

### Health Check

Once the application is running, verify it's working:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime_sec": 123.456
}
```

### API Documentation

Access the interactive API documentation:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

## Next Steps

- [Configure your AI providers](configuration.md)
- [Learn about the API](api-guide.md)
- [Set up development environment](development-setup.md)
- [Deploy to production](deployment.md)

