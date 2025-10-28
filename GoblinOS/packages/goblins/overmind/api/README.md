# 🚀 Overmind FastAPI Backend

Production-ready REST API for the Overmind orchestrator.

## Features

- **RESTful API**: Complete CRUD endpoints for chat, crews, memory
- **WebSocket**: Real-time updates for crew execution
- **Authentication**: OAuth2 with JWT tokens
- **Rate Limiting**: Per-user and global rate limits
- **Observability**: Structured logging, Prometheus metrics, health checks
- **Security**: CORS, input validation, API key auth

## Quick Start

### Installation

```bash
cd api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Run Development Server

```bash
# With hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Or use the npm script from parent
cd .. && pnpm dev:api
```

### Run Production Server

```bash
# With gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001

# Or with Docker
docker build -t overmind-api .
docker run -p 8001:8001 --env-file .env overmind-api
```

## API Documentation

Once running, visit:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **OpenAPI JSON**: http://localhost:8001/openapi.json

## Endpoints

### Chat

- `POST /api/v1/chat` - Send a message to Overmind
- `GET /api/v1/chat/history` - Get conversation history
- `DELETE /api/v1/chat/history` - Clear conversation history

### Crews

- `POST /api/v1/crews` - Create and run a crew
- `GET /api/v1/crews` - List all crews
- `GET /api/v1/crews/{crew_id}` - Get crew status
- `DELETE /api/v1/crews/{crew_id}` - Cancel a crew
- `WS /api/v1/crews/{crew_id}/stream` - WebSocket stream for crew updates

### Memory

- `POST /api/v1/memory/facts` - Store a fact
- `GET /api/v1/memory/search` - Search memories
- `POST /api/v1/memory/entities` - Track an entity
- `GET /api/v1/memory/entities` - List entities
- `POST /api/v1/memory/episodes` - Create an episode
- `GET /api/v1/memory/episodes` - List episodes
- `GET /api/v1/memory/stats` - Memory statistics

### System

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /api/v1/config` - Get configuration
- `GET /api/v1/providers` - List available LLM providers

## Authentication

The API supports two authentication methods:

### 1. API Key (Recommended for M2M)

```bash
curl -H "X-API-Key: your_api_key" http://localhost:8001/api/v1/chat
```

### 2. OAuth2 JWT Bearer Token

```bash
# Get token
curl -X POST http://localhost:8001/api/v1/auth/token \
  -d "username=user&password=pass"

# Use token
curl -H "Authorization: Bearer <token>" http://localhost:8001/api/v1/chat
```

## Rate Limiting

Default limits:
- **Per User**: 100 requests/minute
- **Global**: 1000 requests/minute

Headers returned:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## WebSocket Example

```javascript
const ws = new WebSocket('ws://localhost:8001/api/v1/crews/crew-123/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Crew update:', data);
};
```

## Project Structure

```
api/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration management
│   ├── dependencies.py      # Dependency injection
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── router.py    # Main API router
│   │       ├── chat.py      # Chat endpoints
│   │       ├── crews.py     # Crew endpoints
│   │       ├── memory.py    # Memory endpoints
│   │       └── websocket.py # WebSocket handlers
│   │
│   ├── core/
│   │   ├── auth.py          # Authentication logic
│   │   ├── security.py      # Security utilities
│   │   └── rate_limit.py    # Rate limiting
│   │
│   ├── models/
│   │   ├── chat.py          # Pydantic models for chat
│   │   ├── crew.py          # Pydantic models for crews
│   │   └── memory.py        # Pydantic models for memory
│   │
│   └── services/
│       └── overmind.py      # Overmind service wrapper
│
├── tests/
│   ├── test_chat.py
│   ├── test_crews.py
│   └── test_memory.py
│
├── requirements.txt         # Python dependencies
├── Dockerfile              # Container image
└── README.md               # This file
```

## Development

### Install dev dependencies

```bash
pip install -r requirements-dev.txt
```

### Run tests

```bash
pytest
pytest --cov=app tests/  # With coverage
```

### Format code

```bash
ruff format .
ruff check . --fix
```

### Type checking

```bash
mypy app/
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `OVERMIND_API_KEY` - API key for authentication
- `OVERMIND_JWT_SECRET` - Secret for JWT tokens
- `OVERMIND_RATE_LIMIT` - Rate limit (requests/minute)
- `OVERMIND_CORS_ORIGINS` - Allowed CORS origins
- `OVERMIND_LOG_LEVEL` - Logging level

## Deployment

### Docker

```bash
# Build
docker build -t overmind-api .

# Run
docker run -p 8001:8001 --env-file .env overmind-api
```

### Kubernetes

See `../infra/k8s/` for Kubernetes manifests.

```bash
kubectl apply -f ../infra/k8s/overmind-api/
```

## Monitoring

### Health Checks

```bash
curl http://localhost:8001/health
```

Response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 3600,
  "checks": {
    "overmind": "ok",
    "memory": "ok",
    "providers": ["openai", "deepseek", "gemini"]
  }
}
```

### Metrics

Prometheus metrics available at `/metrics`:
- `overmind_requests_total` - Total requests
- `overmind_request_duration_seconds` - Request latency
- `overmind_chat_messages_total` - Chat messages processed
- `overmind_crews_active` - Active crews
- `overmind_memory_entries_total` - Total memory entries
- `overmind_llm_calls_total` - LLM API calls by provider

## License

MIT
