---
title: Workspace Overview
type: reference
project: ForgeMonorepo
status: draft
owner: GoblinOS
---

High-level workspace structure, run commands, and ports for the **ForgeMonorepo**.

## 🏗️ Workspace Structure

This is a **VS Code multi-root workspace** with the following projects:

- **🏗️ ForgeTM** - FastAPI backend + React/TypeScript frontend
- **🤖 GoblinOS** - Agents, servers, and evaluation tools
- **📚 Obsidian** - Central repository for all `.md` notes and documentation
- **🚀 ForgeMonorepo** - Root orchestration and cross-project tooling

## 🖥️ Opening the Workspace

```bash
code /Users/fuaadabdullah/ForgeMonorepo/forge.code-workspace
```

## �️ Default Ports

| Service | Port | Project | Status | Description |
|---------|------|---------|--------|-------------|
| ⚡ Backend API | 8000 | ForgeTM | 🟢 FastAPI | LLM proxy with OpenAI, Gemini, DeepSeek |
| 🎨 Frontend Dev | 5173 | ForgeTM | 🟢 Vite | React dashboard (when running) |
| 🤖 Goblins Server | 8080 | GoblinOS | 🟢 Node.js | Agent services and evaluation tools |
| 📊 Jaeger UI | 16686 | Observability | 🟡 Optional | Distributed tracing (when running) |
| 📡 OTLP Traces | 4318 | Observability | 🟡 Optional | OpenTelemetry trace ingestion |

## 🚀 Quick Start Commands

### 🔥 Start the Entire Stack

Use the VS Code task `dev:stack` or run individually:

```bash
# 🏗️ Backend (from ForgeTM/apps/backend)
# Requires: API keys configured in .env
source apps/backend/.venv/bin/activate
uvicorn forge.main:app --reload --host 127.0.0.1 --port 8000

# 🎨 Frontend (from ForgeTM/apps/frontend)
pnpm dev

# 🤖 Goblins (from GoblinOS)
pnpm dev
```

### 🔑 API Key Setup (Required for Backend)

Before starting the backend, configure API keys:

```bash
# Copy environment template
cp ForgeTM/apps/backend/.env.example ForgeTM/apps/backend/.env

# Edit with your API keys
# - References `Obsidian/API_KEYS_MANAGEMENT.md`
```

### 🧹 Lint All Projects

```bash
# Unified linting (Biome + Python)
bash tools/lint_all.sh

# Or use smithy directly
cd GoblinOS/packages/goblins/forge-smithy
uv run python -m smithy check
```

### 🔧 Code Quality Tools

The workspace uses **smithy** for unified multi-language code quality:

```bash
# Biome operations (JavaScript/TypeScript)
uv run python -m smithy biome-check     # Lint JS/TS code with enterprise rules
uv run python -m smithy biome-fix       # Auto-fix linting issues
uv run python -m smithy biome-format    # Format code consistently
uv run python -m smithy biome-imports   # Organize and sort imports

# Python operations
uv run python -m smithy check           # Full repo hygiene (Biome + Python)
```

### 🧪 Run Smoke Tests

```bash
bash tools/smoke.sh
```

## 📂 Directory Placement Rules

- **🐍 Backend code:** `ForgeTM/apps/backend/src`
- **🎨 Frontend code:** `ForgeTM/apps/frontend`
- **🤖 Agent services:** `GoblinOS/goblins`
- **📝 Documentation/Notes:** `Obsidian/`
- **🔧 Cross-repo scripts:** `tools/`
- **🐳 Infrastructure:** `infra/`

## ⚠️ Path Change Checklist

If you need to move or rename workspace folders, follow the **8-step Path Change Checklist** documented in the repository's copilot-instructions. This ensures workspace integrity and CI compatibility.

## 📖 More Information

- 🏗️ **ForgeTM**: See `ForgeTM/README.md` and `ForgeTM/CONTRIBUTING.md`
- 🤖 **GoblinOS**: See `GoblinOS/README.md` and `GoblinOS/AGENT_RULES.md`
- 🐳 **Infrastructure**: See `infra/HEALTHCHECKS.md`
