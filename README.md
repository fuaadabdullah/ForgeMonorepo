
# 🚀 ForgeMonorepo

> 🧠💹 A sophisticated multi-project workspace for AI-powered trading and automation systems

## Table of Contents
- Guild System Overview
- Project Structure
- Quick Start
- Development Commands
- Guild Operations & Overmind Dashboard
- Prerequisites
- Key Links
- Development Workflow
- Contributing

## 🏰 Guild System Overview

This monorepo operates under the **GoblinOS guild system**, where specialized AI agents (goblins) autonomously manage different domains of software development and operations. The system is orchestrated by the **Overmind** and governed by the canonical [Guild Charter](Obsidian/📋%20Projects/GoblinOS/Guild_Glossary_and_Charter.md).

### Core Guilds & Responsibilities

| Guild | Goblin Master(s) | Domain | Key KPIs |
|-------|------------------|--------|----------|
| **🛠️ Forge** | Dregg Embercode | Build graph, performance budgets, break-glass fixes | `p95_build_time < 5min`, `failed_build_rate < 2%` |
| **🎨 Crafters** | Vanta Lumin (UI/UX), Volt Furnace (APIs) | Full UX surface & service contracts | `accessibility_score > 95%`, `api_uptime > 99.9%` |
| **🏹 Huntress** | Magnolia Nightbloom (Tests), Mags Charietto (Monitoring) | Flaky test hunting & early signal detection | `test_flakiness_rate < 1%`, `signal_precision > 85%` |
| **🔐 Keepers** | Sentenial Ledgerwarden | Secrets, SBOMs, backups, security | `secret_rotation_compliance = 100%`, `backup_success_rate > 99.9%` |
| **🔮 Mages** | Hex Oracle (Forecasting), Grim Rune (Anomalies), Launcey Gauge (Quality) | Risk forecasting, anomaly detection, quality gates | `forecast_accuracy > 80%`, `lint_compliance > 98%` |

#### Operating Manuals
- 🛠️ Forge: [Operating Manual](Obsidian/📋%20Projects/GoblinOS/Operating_Manuals/Forge_Operating_Manual.md)
- 🎨 Crafters: [Operating Manual](Obsidian/📋%20Projects/GoblinOS/Operating_Manuals/Crafters_Operating_Manual.md)
- 🏹 Huntress: [Operating Manual](Obsidian/📋%20Projects/GoblinOS/Operating_Manuals/Huntress_Operating_Manual.md)
- 🔐 Keepers: [Operating Manual](Obsidian/📋%20Projects/GoblinOS/Operating_Manuals/Keepers_Operating_Manual.md)
- 🔮 Mages: [Operating Manual](Obsidian/📋%20Projects/GoblinOS/Operating_Manuals/Mages_Operating_Manual.md)

### LiteBrain Routing Matrix

All guild operations use intelligent model routing with local-first preferences:

- **Local Models**: `ollama`, `ollama-coder` (always preferred for speed/cost)
- **Primary Routers**: `deepseek-r1` (reasoning), `openai` (code), `gemini` (analysis)
- **Embeddings**: `nomic-embed-text` (RAG operations)
- **Audit Trail**: All routing decisions logged to `goblinos.overmind.router-audit`

### Quality Gates & PR Checks

Automated policy gates enforce guild standards:

- `keepers/sentenial-check` - Security scanning & secret detection (Sentenial Ledgerwarden)
- `mages/quality-check` - Lint, test, schema validation (Launcey Gauge)
- `crafters/ui-a11y-check` - Accessibility & UI standards (Vanta Lumin)
- `forge/perf-benchmark` - Performance regression testing (Dregg Embercode)

## 📁 Project Structure

### 🏗️ ForgeTM - Trading & Market Analysis Platform

**Owned by: Crafters Guild (Vanta Lumin & Volt Furnace)**

- ⚡ **Backend**: FastAPI (Python) - High-performance trading APIs with LiteLLM proxy
- 🎨 **Frontend**: React + TypeScript - Modern trading dashboard integrated into Overmind
- 📊 **Features**: Real-time market data, algorithmic trading, AI-powered analysis
- 🔧 **Quality Gates**: `crafters/ui-a11y-check`, `mages/quality-check`

### 🤖 GoblinOS - AI Agents & Automation System

**Owned by: All Guilds (Overmind orchestration)**

- 🧠 **Core**: TypeScript/Node.js - Intelligent agent orchestration and guild operations
- 🎨 **Dashboard**: React/Vite frontend with Tauri desktop application for the GoblinOS Hub
- 🛠️ **Smithy**: Python environment tooling with Biome v1.9.4+ integration
- 📈 **Features**: AI evaluation tools, automated workflows, model management, multi-language code quality
- 🔧 **Quality Gates**: All guild gates apply

### 📚 Obsidian - Knowledge Base & Documentation

**Owned by: Mages Guild (Launcey Gauge - Diátaxis conformance)**

- 📝 **Notes**: Comprehensive project documentation following Diátaxis principles
- 🔍 **Search**: Centralized knowledge management with RAG capabilities
- 📖 **Guides**: Setup instructions, best practices, and tutorials
- 🔧 **Quality Gates**: `mages/quality-check` (documentation standards)

### 🛠️ Infrastructure & Tools

**Owned by: Forge Guild (Dregg Embercode) & Keepers Guild (Sentenial Ledgerwarden)**

- 🐳 **Infra**: Kubernetes charts, gitops configurations, and infrastructure-as-code
- 🔧 **Tools**: Cross-project scripts, linting, and automation (Biome + Python)
- 📋 **Docs**: API references and workspace guidelines
- 🔧 **Quality Gates**: `forge/perf-benchmark`, `keepers/sentenial-check`

## 🚀 Quick Start

### 📂 Open the Workspace

```bash
code forge.code-workspace
```

### ▶️ Start Development Stack

```bash
# Use VS Code Tasks: dev:stack
# Or run individually:
# Backend: backend:run (port 8000)
# Frontend: frontend:dev (port 5173)
# Goblins: goblins:serve (port 8080)
```

### 🛠️ Development Commands

```bash
# Lint all projects
pnpm lint:all

# Run tests
pnpm test

# Build all projects
pnpm build

# Validate guild registry & telemetry coherence
pnpm -C GoblinOS telemetry:validate

# Guild CLIs (registry-backed toolbelts)
pnpm -C GoblinOS crafters-guild --help
pnpm -C GoblinOS huntress-guild --help
pnpm -C GoblinOS keepers-guild --help
pnpm -C GoblinOS mages-guild --help
```

## Guild Operations & Overmind Dashboard

The **Overmind dashboard** provides unified access to all guild operations and telemetry:

```bash
pnpm -C GoblinOS/packages/goblins/overmind/dashboard dev
```

Navigate to guild control centers:

- **🛠️ Forge Guild**: `/forge` - Build metrics, performance budgets, infrastructure health
- **🎨 Crafters Guild**: `/crafters` - UI/UX KPIs, API uptime, accessibility scores
- **🏹 Huntress Guild**: `/huntress` - Test reliability, anomaly detection, signal intelligence
- **🔐 Keepers Guild**: `/keepers` - Security compliance, vault health, backup status
- **🔮 Mages Guild**: `/mages` - Forecasting accuracy, quality gates, anomaly detection

### LiteBrain Routing & Telemetry

All guild operations route through intelligent model selection with full audit trails:

- **Local-First**: `ollama`/`ollama-coder` preferred for speed and cost
- **Escalation**: Automatic routing to `deepseek-r1`, `openai`, `gemini` based on complexity
- **Audit**: All decisions logged to `goblinos.overmind.router-audit`
- **Monitoring**: Real-time telemetry across all guild dashboards

## 📋 Prerequisites

- 🐍 **Python 3.11+** (for ForgeTM backend)
- 🟢 **Node.js 20+** (for all TypeScript projects)
- 📦 **pnpm** (package manager)
- 🐳 **Docker** (optional, for containerized development)

Note: This repository is configured as a pnpm workspace (see `packageManager` in `package.json`). We recommend installing pnpm and running `pnpm install` at the repo root. If you want to launch the Tauri desktop (GoblinOS Hub) from the repo root in development mode, you can run `pnpm tauri:dev` which invokes the Tauri CLI in the dashboard package context.

## 🔗 Key Links

- 📖 **[Guild Charter](Obsidian/📋%20Projects/GoblinOS/Guild_Glossary_and_Charter.md)** - Canonical guild responsibilities and LiteBrain routing
- 🔐 **[API Keys Guide](Obsidian/🔐%20Security%20&%20Keys/API_KEYS_MANAGEMENT.md)** - External service configuration
- 🤝 **[Contributing Guide](CONTRIBUTING.md)** - Development guidelines and guild onboarding
- 📚 **[Diátaxis Documentation](Obsidian/📚%20Documentation/)** - Tutorials, reference, how-to, and conceptual guides
- 🐛 **[Issues](../../issues)** - Bug reports and feature requests

## 🎯 Development Workflow

1. **📥 Setup**: Clone repo and open workspace
2. **📦 Install**: Run `pnpm install` in root
3. **⚙️ Configure**: Copy `.env.example` files and add API keys
4. **💻 Develop**: Use `dev:stack` task for full development environment
5. **🧪 Test**: Run `pnpm test` and `lint:all` before committing
6. **🚀 Deploy**: Follow infrastructure guides in `infra/`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- 🐛 Reporting bugs
- ✨ Requesting features
- 🔀 Submitting pull requests
- 📝 Documentation updates

All contributions must pass guild quality gates and align with the established charter.

---

Built with ❤️ using modern AI and full-stack technologies. Operated by autonomous goblins under Overmind orchestration.
