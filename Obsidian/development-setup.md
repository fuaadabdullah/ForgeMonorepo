# Development Setup

This guide covers setting up a development environment for ForgeTM Backend.

## Prerequisites

### System Requirements

- **Python 3.11+**: The backend requires Python 3.11 or higher
- **uv**: Modern Python package manager (faster than pip)
- **Git**: Version control
- **Docker & Docker Compose**: For containerized services

### Optional Tools

- **Ollama**: For local AI model testing
- **Jaeger**: For distributed tracing visualization
- **VS Code**: Recommended IDE with Python extensions

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ForgeMonorepo/ForgeTM/apps/backend
```

### 2. Install uv (if not already installed)

```bash
# macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.sh | iex"
```

### 3. Install Dependencies

```bash
# Install all dependencies (including dev dependencies)
uv sync

# Verify installation
uv run python -c "import forge; print('Installation successful')"
```

### 4. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# The default .env.example should work for basic development
# Edit .env if you need to customize settings
```

## Running the Application

### Development Server

```bash
# Start with auto-reload
uv run uvicorn forge.main:app --reload --host 127.0.0.1 --port 8000

# Or using Python directly
python -m uvicorn forge.main:app --reload
```

### With Docker Compose

```bash
# Start all services (backend, redis, etc.)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Development Workflow

### Code Changes

1. **Make changes** to source code in `src/forge/`
2. **Run tests** to ensure changes work correctly
3. **Check linting** and formatting
4. **Test manually** using API endpoints

### Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=forge --cov-report=html

# Run specific test file
uv run pytest tests/test_tasks.py

# Run tests in watch mode (if pytest-watch installed)
uv run ptw
```

### Code Quality

```bash
# Linting
uv run ruff check .

# Auto-fix linting issues
uv run ruff check --fix .

# Formatting
uv run ruff format .

# Type checking
uv run mypy src/
```

### Documentation

```bash
# Serve documentation locally
uv run mkdocs serve

# Build documentation
uv run mkdocs build
```

## IDE Setup

### VS Code

Install recommended extensions:

- Python (Microsoft)
- Pylance (Microsoft)
- Ruff (charliermarsh)
- Python Debugger (Microsoft)

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "./.venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "python.formatting.provider": "ruff",
  "python.analysis.typeCheckingMode": "standard",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.ruff": "explicit",
    "source.organizeImports.ruff": "explicit"
  }
}
```

### PyCharm/IntelliJ

1. Open project in IDE
2. Configure Python interpreter: `File → Settings → Project → Python Interpreter → Add → Virtualenv Environment → Select .venv/bin/python`
3. Enable Ruff integration in plugins
4. Configure run/debug configurations for FastAPI

## Debugging

### Local Debugging

```bash
# Run with debug logging
LOG_LEVEL=DEBUG uv run uvicorn forge.main:app --reload

# Or set in .env
# LOG_LEVEL=DEBUG
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["forge.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
      "cwd": "${workspaceFolder}/ForgeTM/apps/backend",
      "python": "./.venv/bin/python",
      "console": "integratedTerminal"
    },
    {
      "name": "Tests",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": ["tests/"],
      "cwd": "${workspaceFolder}/ForgeTM/apps/backend",
      "python": "./.venv/bin/python"
    }
  ]
}
```

### Remote Debugging

For debugging in Docker containers:

```bash
# Run with debugpy
uv run python -m debugpy --listen 0.0.0.0:5678 -m uvicorn forge.main:app --host 0.0.0.0 --port 8000
```

## Testing External Services

### Ollama Setup

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
ollama serve

# Pull a test model
ollama pull llama2:7b

# Verify
curl http://localhost:11434/api/tags
```

### LiteLLM Setup

```bash
# Install LiteLLM
pip install litellm

# Start proxy (in another terminal)
litellm --model gpt-3.5-turbo --api_key your-openai-key

# Or use Docker
docker run -p 4000:4000 ghcr.io/berriai/litellm:main --model gpt-3.5-turbo --api_key your-openai-key
```

### Jaeger Setup

```bash
# Start Jaeger for tracing
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# View traces at http://localhost:16686
```

## Background Tasks

### Running Celery Worker

```bash
# Start worker for background tasks
uv run celery worker -A forge.celery_app --loglevel=info

# Or with beat scheduler
uv run celery worker -A forge.celery_app --loglevel=info --beat
```

### Testing Background Tasks

```bash
# In Python REPL
from forge.tasks import health_check_task
result = health_check_task.delay()
print(result.get())
```

## Database Setup (if applicable)

If your application uses a database:

```bash
# Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=forge \
  -p 5432:5432 \
  postgres:15

# Run migrations (if using Alembic)
uv run alembic upgrade head
```

## Performance Profiling

### Memory Profiling

```bash
# Install memory profiler
uv add memory-profiler --dev

# Profile a function
uv run python -m memory_profiler forge/tasks.py
```

### CPU Profiling

```bash
# Install py-spy
pip install py-spy

# Profile running application
py-spy top --pid $(pgrep -f uvicorn)
```

## Contributing

### Pre-commit Hooks

```bash
# Install pre-commit
uv run pre-commit install

# Run on all files
uv run pre-commit run --all-files
```

### Git Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add my feature"`
3. Push and create PR: `git push origin feature/my-feature`

### Commit Conventions

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `refactor:` - Code restructuring
- `test:` - Testing
- `chore:` - Maintenance

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure virtual environment is activated
2. **Port already in use**: Change port in `.env` or kill process
3. **Redis connection failed**: Start Redis with `docker-compose up redis`
4. **Ollama not responding**: Check if Ollama service is running

### Getting Help

- Check application logs: `docker-compose logs backend`
- Enable debug logging: `LOG_LEVEL=DEBUG`
- Check health endpoints: `curl http://localhost:8000/health`
- Review documentation: `mkdocs serve`
