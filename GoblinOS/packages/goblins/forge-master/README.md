---
title: Forge Guild - Forge Master Backend
type: reference
project: GoblinOS
status: reviewed
owner: GoblinOS
goblin_name: Dregg Embercode
---

# 🔨 Forge Guild · Dregg Embercode's Forge Master Backend

> **World-class development environment orchestration with IaC, dependency management, configuration handling, and CI/CD automation—aligned with the Overmind guild charter defined in `goblins.yaml`.**

Forge Guild is the ultimate development environment orchestrator that implements industry best practices from IBM, Microsoft, and RedHat research. It provides Dregg Embercode’s Forge Master backend for reproducible, automated development workflows that protect performance budgets and the build graph. Responsibilities map 1:1 with the Forge Master charter: keep p95 build time low, preserve hot reload, and own break-glass fixes.

## ✨ Key Features

### 🏗️ Environment Setup (Overmind)
- **Infrastructure as Code**: Terraform, Ansible, and ARM templates for reproducible environments
- **Containerization**: Docker and development containers for consistent runtimes
- **Automated Provisioning**: CI/CD-driven environment spin-up and teardown
- **Configuration Drift Prevention**: Version-controlled environment definitions

### 📦 Dependency Management (Forge Guild Backend)
- **Poetry/Pipenv Integration**: Modern Python dependency management
- **Lockfile Generation**: Deterministic builds with exact version pinning
- **Virtual Environment Automation**: Consistent Python environments
- **Dependency Auditing**: Security and compatibility checks

### ⚙️ Configuration Management (Forge Master)
- **Environment Variables**: 12-factor app configuration patterns
- **Config Files**: JSON/YAML/TOML support with runtime loading
- **Secret Vaults**: Integration with HashiCorp Vault and cloud secret managers
- **Externalized Config**: Environment-specific settings outside code

### 🚀 CI/CD Automation (Overwind Pipeline)
- **GitOps Workflows**: Manifest-driven deployments
- **Pipeline Templates**: GitHub Actions, GitLab CI, Jenkins configurations
- **Automated Testing**: Build, test, and deploy on every push
- **Environment Promotion**: Staging to production automation

## 🛠️ Forge Guild CLI

Forge Guild provides a command-line interface for dependency management and code quality operations across the monorepo, led by the Forge Master (Dregg Ember).

### Installation

```bash
# Install globally (recommended)
pnpm -C GoblinOS/packages/goblins/forge-master run build
pnpm add -g @goblinos/forge-master

# Or run locally
pnpm -C GoblinOS forge-guild --help
```

### Dependency Management

```bash
# Update all Python dependencies
forge-guild deps update

# Resolve dependency conflicts
forge-guild deps resolve

# Security audit of dependencies
forge-guild deps audit

# Sync environment with lockfile
forge-guild deps sync

### Secrets & Credentials

```bash
# Redacted list of stored secrets
forge-guild secrets list

# Fetch a secret value
forge-guild secrets get OPENAI_API_KEY

# Store/update a secret (writes to keyring + optional .env)
forge-guild secrets set OPENAI_API_KEY \"sk-...\" --env-file ForgeTM/apps/backend/.env

# Sync common keys into an .env file
forge-guild secrets sync-env ForgeTM/apps/backend/.env \\
  --keys OPENAI_API_KEY,GEMINI_API_KEY,PINECONE_API_KEY,DEEPSEEK_API_KEY
```

### Break-Glass Utilities

- VS Code task **\"🔥 Dregg: kill port 8000\"** wraps `tools/scripts/kill-port.sh 8000` to free a wedged dev server before rerunning Forge Guild flows.
- After any emergency kill, re-run `pnpm forge-guild check` to restore lint + dependency hygiene and log the intervention via Overmind router audit.

### Code Quality (Biome)

```bash
# Check Biome linting
forge-guild biome-check

# Auto-fix Biome issues
forge-guild biome-fix

# Format code with Biome
forge-guild biome-format

# Organize imports with Biome
forge-guild biome-imports
```

### Via pnpm Scripts

```bash
# From GoblinOS root
pnpm forge-guild deps update
pnpm forge-guild biome-check

# From monorepo root
pnpm forge-guild:deps update
pnpm forge-guild:biome
```

### Basic Usage

```typescript
import { createForgeGuild } from '@goblinos/forge-master';

// Initialize Forge Guild
const forge = createForgeGuild();

// Generate Poetry project structure
await forge.initPythonProject({
  name: 'my-awesome-app',
  pythonVersion: '3.11',
  dependencies: ['fastapi', 'pydantic']
});

// Create CI/CD pipeline
await forge.createPipeline({
  provider: 'github-actions',
  environments: ['dev', 'staging', 'prod']
});
```

### Advanced: Full Project Setup

```typescript
import { createForgeGuild } from '@goblinos/forge-master';

const forge = createForgeGuild();

// Complete project scaffolding with best practices
const project = await forge.scaffoldProject({
  name: 'enterprise-api',
  type: 'fastapi',
  features: ['iac', 'cicd', 'secrets', 'monitoring'],
  environments: ['development', 'staging', 'production']
});

console.log('Project created at:', project.path);
console.log('Next steps:', project.nextSteps);
```

## 🏗️ Architecture Components

### Environment Setup (Overmind)
Handles infrastructure and development environment provisioning:

```typescript
// IaC template generation
const terraform = await forge.generateTerraform({
  provider: 'aws',
  resources: ['vpc', 'ecs', 'rds'],
  environment: 'production'
});

// Development container setup
const devcontainer = await forge.createDevContainer({
  baseImage: 'python:3.11',
  features: ['docker-in-docker', 'aws-cli'],
  extensions: ['ms-python.python', 'hashicorp.terraform']
});
```

### Dependency Management (Forge Guild Backend)
Python dependency orchestration with Poetry/Pipenv:

```typescript
// Poetry project initialization
await forge.initPoetry({
  name: 'data-pipeline',
  version: '0.1.0',
  python: '^3.11',
  dependencies: {
    'pandas': '^2.0.0',
    'sqlalchemy': '^2.0.0'
  }
});

// Lockfile generation and validation
const lockfile = await forge.generateLockfile({
  tool: 'poetry',
  update: false,
  audit: true
});
```

### Configuration Management (Goblin Smithy)
Secure, flexible configuration handling with schema validation:

```typescript
import { EnvironmentManager } from '@goblinos/forge-master/environment';

// Initialize environment manager
const envManager = new EnvironmentManager({ logger });

// Load and validate environment variables
const config = await envManager.loadSmithyEnv({
  envPath: '.env',
  projectOverrides: { PROJECT_NAME: 'my-app' },
  agentOverrides: { AGENT_ID: 'scaffold-agent' }
});

// Access validated config
console.log(config.GEMINI_API_KEY); // Type-safe access
console.log(config.LOG_LEVEL);      // With defaults applied
```

#### Environment Variable Validation
Smithy uses Zod schemas for runtime validation of environment variables:

- **Schema-driven**: All env vars defined with types and defaults
- **Multi-context**: Global, project, and agent-specific overlays
- **Auto-update**: Missing vars automatically added to `.env.example`
- **Security-first**: Never hardcode secrets, always use env vars
- **Helpful errors**: Clear messages with links to API key docs

#### Supported Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEMINI_API_KEY` | string | - | Google Gemini API key |
| `DEEPSEEK_API_KEY` | string | - | DeepSeek API key |
| `OPENAI_API_KEY` | string | - | OpenAI API key |
| `OLLAMA_BASE_URL` | string | `http://localhost:11434` | Ollama server URL |
| `LOG_LEVEL` | enum | `info` | Logging level (debug/info/warn/error) |
| `MAX_CONCURRENT_TASKS` | number | `5` | Concurrent task limit |
| `ENABLE_SECURITY_SCAN` | boolean | `true` | Enable security scanning |

See `src/environment/schema.ts` for complete schema definition.

### CI/CD Automation (Overwind Pipeline)
GitOps and pipeline orchestration:

```typescript
// GitHub Actions pipeline
const pipeline = await forge.createGitHubActions({
  name: 'deploy-api',
  triggers: ['push', 'pull_request'],
  jobs: {
    test: { runsOn: 'ubuntu-latest', steps: ['checkout', 'setup-python', 'pytest'] },
    deploy: { needs: 'test', environment: 'production' }
  }
});

// GitOps deployment manifests
await forge.generateKustomize({
  base: './k8s/base',
  overlays: ['dev', 'staging', 'prod'],
  images: ['api:v1.2.3', 'worker:v1.0.1']
});
```

## 📊 Best Practices Implementation

### Infrastructure as Code
- **Version Control**: All infrastructure defined in Git
- **Code Review**: Infrastructure changes reviewed like code
- **Testing**: Automated testing of infrastructure changes
- **Drift Detection**: Monitor and correct configuration drift

### Dependency Management
- **Pinned Versions**: Exact versions in lockfiles
- **Security Scanning**: Automated vulnerability detection
- **License Compliance**: Dependency license checking
- **Update Automation**: Safe dependency updates with testing

### Configuration Management
- **Externalization**: Config outside application code
- **Environment Separation**: Different configs per environment
- **Secret Rotation**: Automated secret lifecycle management
- **Access Control**: Least-privilege secret access

### CI/CD Automation
- **Pipeline as Code**: Version-controlled pipeline definitions
- **Automated Testing**: Comprehensive test automation
- **Deployment Safety**: Progressive deployment strategies
- **Monitoring Integration**: Observability in pipelines

## 📁 Project Structure

```
forge-master/
├── package.json           # Dependencies & scripts
├── tsconfig.json         # TypeScript config
├── README.md             # This file
├── src/
│   ├── index.ts          # Main Forge Guild orchestrator
│   ├── types.ts          # TypeScript types & schemas
│   ├── environment/
│   │   ├── iac.ts        # Infrastructure as Code generators
│   │   ├── containers.ts # Docker/dev container setup
│   │   └── provisioning.ts # Environment provisioning
│   ├── dependencies/
│   │   ├── poetry.ts     # Poetry integration
│   │   ├── pipenv.ts     # Pipenv integration
│   │   └── lockfile.ts   # Lockfile management
│   ├── configuration/
│   │   ├── loader.ts     # Config file loading
│   │   ├── vault.ts      # Secret vault integration
│   │   └── env.ts        # Environment variable management
│   └── cicd/
│       ├── github.ts     # GitHub Actions
│       ├── gitlab.ts     # GitLab CI
│       ├── jenkins.ts    # Jenkins pipelines
│       └── gitops.ts     # GitOps manifests
└── tests/
    ├── environment.test.ts
    ├── dependencies.test.ts
    ├── configuration.test.ts
    └── cicd.test.ts
```

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FORGE_GUILD_LOG_LEVEL` | No | `info` | Logging level |
| `FORGE_MASTER_CACHE_DIR` | No | `~/.forge-master` | Cache directory |
| `FORGE_GUILD_TEMPLATES_DIR` | No | `./templates` | Template directory |

### Supported Providers

#### IaC Providers
- **Terraform**: AWS, Azure, GCP
- **ARM Templates**: Azure Resource Manager
- **CloudFormation**: AWS
- **Ansible**: Multi-cloud infrastructure

#### CI/CD Providers
- **GitHub Actions**: YAML-based workflows
- **GitLab CI**: `.gitlab-ci.yml` pipelines
- **Jenkins**: Declarative pipelines
- **Azure DevOps**: YAML pipelines

#### Secret Providers
- **HashiCorp Vault**: Enterprise secret management
- **AWS Secrets Manager**: Cloud-native secrets
- **Azure Key Vault**: Microsoft cloud secrets
- **GCP Secret Manager**: Google Cloud secrets

## 🔧 Maintenance Guidelines

### Environment Variables Validation

Forge Master automatically validates that all environment variables used in code are documented in `.env.example`. Run the validator:

```bash
bash scripts/validate_envs.sh
```

For local development, generate a `.env.local` file from `.env.example`:

```bash
bash scripts/create_env_local.sh
```

### Template Smoke Tests

Run smoke tests to ensure templates scaffold correctly:

```bash
pnpm test  # Includes smoke tests
```

### CI/CD Maintenance

The `forge-master-maintenance.yml` workflow runs automatically on changes to Forge Master files:

- Validates environment variables
- Runs unit and smoke tests
- Creates auto-fix PRs on failures

### PR Checklist for Forge Master Changes

When modifying Forge Master templates or code:

- [ ] Run `bash scripts/validate_envs.sh` and fix any missing env vars
- [ ] Update `.env.example` if new environment variables are added
- [ ] Run `pnpm test` to ensure smoke tests pass
- [ ] Add unit tests for new functionality
- [ ] Update this README if APIs change
- [ ] Label PR with `area/forge-master`
- [ ] Require GoblinOS owner review
- [ ] Include `Tool-owner: GoblinOS` in PR body

### Template Drift Prevention

Templates are versioned and tested regularly. If dependencies become outdated:

1. Update template manifests
2. Run smoke tests
3. Create PR with `chore(forge-master): update template dependencies`

### Customization Extensions

For one-off designs beyond default templates:

1. Extend existing templates with optional features
2. Document extensions in template metadata
3. Add toggle flags in scaffold config
4. Test extensions with smoke tests

---

**Project**: GoblinOS
**Owner**: GoblinOS Team
**Goblin**: Forge Guild 🔨
**Last Updated**: October 25, 2025

## 🎯 Roadmap

- [x] Core scaffolding system
- [x] Poetry/Pipenv integration
- [x] IaC template generation
- [x] CI/CD pipeline creation
- [ ] Secret vault integration
- [ ] Multi-cloud provider support
- [ ] Advanced GitOps workflows
- [ ] Performance monitoring integration
