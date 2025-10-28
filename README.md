# 🚀 ForgeMonorepo

> A sophisticated multi-project workspace for AI-powered trading and automation systems

## 📁 Project Structure

This monorepo contains four main projects:

### 🏗️ ForgeTM

#### Trading & Market Analysis Platform

- ⚡ **Backend**: FastAPI (Python) - High-performance trading APIs
- 🎨 **Frontend**: React + TypeScript - Modern trading dashboard
- 📊 **Features**: Real-time market data, algorithmic trading, risk management

### 🤖 GoblinOS

#### AI Agents & Automation System

- 🧠 **Core**: TypeScript/Node.js - Intelligent agent orchestration
- 🛠️ **Smithy**: Python environment tooling with Biome v1.9.4+ integration
- 📈 **Features**: AI evaluation tools, automated workflows, model management, multi-language code quality

### 📚 Obsidian

#### Knowledge Base & Documentation

- 📝 **Notes**: Comprehensive project documentation
- 🔍 **Search**: Centralized knowledge management
- 📖 **Guides**: Setup instructions, best practices, and tutorials

### 🛠️ Infrastructure & Tools

- 🐳 **Infra**: Docker, Kubernetes, CI/CD configurations
- 🔧 **Tools**: Cross-project scripts, linting, and automation (Biome + Python)
- 📋 **Docs**: API references and workspace guidelines

## 🚀 Quick Start

### Open the Workspace

```bash
code forge.code-workspace
```

### Start Development Stack

```bash
# Use VS Code Tasks: dev:stack
# Or run individually:
# Backend: backend:run (port 8000)
# Frontend: frontend:dev (port 5173)
# Goblins: goblins:serve (port 8080)
```

### Development Commands

```bash
# Lint all projects
pnpm lint:all

# Run tests
pnpm test

# Build all projects
pnpm build
```

## 📋 Prerequisites

- 🐍 **Python 3.11+** (for ForgeTM backend)
- 🟢 **Node.js 20+** (for all TypeScript projects)
- 📦 **pnpm** (package manager)
- 🐳 **Docker** (optional, for containerized development)

## 🔗 Key Links

- 📖 **[Workspace Overview](Obsidian/WORKSPACE_OVERVIEW.md)** - Detailed setup and architecture
- 🔐 **[API Keys Guide](Obsidian/API_KEYS_MANAGEMENT.md)** - External service configuration
- 🤝 **[Contributing](CONTRIBUTING.md)** - Development guidelines
- 🐛 **[Issues](../../issues)** - Bug reports and feature requests

## 🎯 Development Workflow

1. **Setup**: Clone repo and open workspace
2. **Install**: Run `pnpm install` in root
3. **Configure**: Copy `.env.example` files and add API keys
4. **Develop**: Use `dev:stack` task for full development environment
5. **Test**: Run `pnpm test` and `lint:all` before committing
6. **Deploy**: Follow infrastructure guides in `infra/`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- 🐛 Reporting bugs
- ✨ Requesting features
- 🔀 Submitting pull requests
- 📝 Documentation updates

---

Built with ❤️ using modern AI and full-stack technologies
