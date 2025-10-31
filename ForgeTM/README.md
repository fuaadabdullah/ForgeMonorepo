---
title: ForgeTM
type: reference
project: ForgeTM
status: draft
owner: Crafters Guild (Vanta Lumin & Volt Furnace)
guild: Crafters Guild
---

## 🏛️ ForgeTM - AI Trading & Market Analysis Platform

**Guild Ownership:** Crafters Guild (Vanta Lumin - UI/UX & Volt Furnace - APIs/Schemas)
**Documentation:** See [Guild Charter](../../Obsidian/📋%20Projects/GoblinOS/Guild_Glossary_and_Charter.md) for guild responsibilities and KPIs.

**Status: Planned for future development.** This project is not yet integrated with GoblinOS. The GoblinOS Overmind dashboard does not currently include trading functionality.

FastAPI backend with unified LLM API. Trading UI will be integrated into the GoblinOS Overmind dashboard under the "Trading Platform" section in a future phase.

## 🏛️ Architecture

A modern full-stack AI platform with:

- ⚡ **Backend**: FastAPI (Python) - Unified LLM API proxy supporting OpenAI, Gemini, and DeepSeek
- 🎨 **Frontend**: Integrated into GoblinOS Overmind dashboard under "📈 Trading Platform" section
- 🤖 **AI Integration**: LiteLLM proxy for multi-provider LLM access
- 📊 **Features**: Real-time market data, algorithmic trading, AI-powered analysis

## 🛡️ Guild Compliance & Quality Gates

**Crafters Guild Standards:** This project follows Crafters Guild quality gates and KPIs.

- **UI/UX KPIs:** CLS < 0.1, accessibility compliance, design token consistency (Vanta Lumin)
- **API KPIs:** Schema validation, idempotency, performance benchmarks (Volt Furnace)
- **Quality Gates:** Must pass `crafters/ui-a11y-check` and `crafters/api-schema-check` PR gates
- **LiteBrain Routing:** Uses `ollama` → `deepseek-r1` and `ollama-coder` → `deepseek-r1` for Crafters Guild work

For detailed guild responsibilities, see the [Guild Charter](../../Obsidian/📋%20Projects/GoblinOS/Guild_Glossary_and_Charter.md).

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

### Frontend (Overmind Dashboard) Setup

**Note:** Trading UI integration is planned for a future phase. Currently, this project has its own frontend in `apps/frontend/`, but it is not active.

To work on GoblinOS (the platform), use:

```bash
cd GoblinOS/packages/goblins/overmind/dashboard
pnpm dev
```

This launches the GoblinOS Overmind dashboard, which currently focuses on guild operations and does not include trading functionality.

### Secrets management (SOPS)

Real API keys are stored encrypted. To materialize them locally run:

```bash
# decrypt backend env (writes ForgeTM/apps/backend/.env)
./decrypt-env.sh ForgeTM/apps/backend
```

You’ll need the appropriate SOPS/age key in your keychain. The decrypted files include real provider keys so keep them out of version control.

## ▶️ Running the Application

```bash
# ⚡ Start FastAPI server
cd ForgeTM/apps/backend
source .venv/bin/activate
uvicorn forge.main:app --reload --host 127.0.0.1 --port 8000
```

### Overmind Dashboard

**Note:** Trading integration is planned for future development. The GoblinOS Overmind dashboard currently hosts guild UI modules but does not include ForgeTM trading functionality.

> **Note:** `ForgeTM/apps/frontend` is retained only as a lightweight pointer that reminds developers to use Overmind. It no longer implements standalone UI.

## 🧪 Development

### Testing

```bash
# Backend tests
cd ForgeTM/apps/backend
source .venv/bin/activate
pytest

# Frontend tests (dashboard)
cd GoblinOS/packages/goblins/overmind/dashboard
pnpm test || true
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
