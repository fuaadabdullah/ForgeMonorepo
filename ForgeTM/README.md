---
title: ForgeTM
type: reference
project: ForgeTM
status: draft
owner: ForgeTM
---

**AI Trading & Market Analysis Platform** - FastAPI backend with unified LLM API + React/TypeScript frontend application.

## 🏛️ Architecture

A modern full-stack AI platform with:

- ⚡ **Backend**: FastAPI (Python) - Unified LLM API proxy supporting OpenAI, Gemini, and DeepSeek
- 🎨 **Frontend**: React + TypeScript + Vite - Modern trading dashboard
- 🤖 **AI Integration**: LiteLLM proxy for multi-provider LLM access
- 📊 **Features**: Real-time market data, algorithmic trading, AI-powered analysis

## 📁 Project Structure

```text
ForgeTM/
├── 📂 apps/
│   ├── 🐍 backend/src/     # FastAPI application with LiteLLM integration
│   │   ├── forge/
│   │   │   ├── api/litellm.py    # LLM proxy endpoints
│   │   │   ├── api/health.py     # Health monitoring
│   │   │   └── main.py           # FastAPI app setup
│   └── 🎨 frontend/        # React + TypeScript SPA
├── ⚙️ .vscode/            # Project-specific tasks and settings
└── 🔧 .env.example        # Environment configuration
```

## 🚀 Quick Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- API keys for AI providers (OpenAI, Gemini, DeepSeek)

### Backend Setup

```bash
# 🐍 Create Python virtual environment
cd ForgeTM/apps/backend
python -m venv .venv
source .venv/bin/activate

# 📦 Install dependencies
pip install -r requirements.txt

# 🔑 Configure API keys
cp .env.example .env
# Edit .env with your actual API keys (see API_KEYS_MANAGEMENT.md)
```

### Frontend Setup

```bash
# 📦 Install Node.js dependencies
cd ForgeTM/apps/frontend
pnpm install
```

## ▶️ Running the Application

Use VS Code tasks or run manually:

### Backend Server

```bash
# ⚡ Start FastAPI server
cd ForgeTM/apps/backend
source .venv/bin/activate
uvicorn forge.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Development

```bash
# 🎨 Start development server
cd ForgeTM/apps/frontend
pnpm dev
```

## 🧪 Development

### Testing

```bash
# Backend tests
cd ForgeTM/apps/backend
source .venv/bin/activate
pytest

# Frontend tests
cd ForgeTM/apps/frontend
pnpm test
```

### Linting

```bash
# 🔍 Lint all code
cd ForgeTM
# Use VS Code tasks or run from root
```

## 🔗 API Documentation

Once running, visit:

- 📖 **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- 🔄 **Alternative Docs**: `http://localhost:8000/redoc`
- 📋 **API Guide**: `Obsidian/api-guide.md`

### Key Endpoints

- `GET /health` - Service health status
- `GET /v1/models` - List available LLM models
- `POST /v1/chat/completions` - Unified chat completions (OpenAI-compatible)
- `GET /v1/providers` - Provider configuration status

## 🤖 AI Providers

The backend integrates with multiple LLM providers through LiteLLM:

- **OpenAI**: GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Google Gemini**: Gemini Pro, Gemini Pro Vision
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder

### API Key Setup

Configure API keys in `apps/backend/.env`:

```bash
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
```

See `Obsidian/API_KEYS_MANAGEMENT.md` for detailed key management instructions.
