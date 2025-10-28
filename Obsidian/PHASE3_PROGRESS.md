# Phase 3: Ollama + Router Supercharge - Progress Report

**Status**: Foundation Complete (Todos 1-3 ✅) | In Progress (Todos 4-11)
**Updated**: October 25, 2025

---

## ✅ Completed Work

### 1. Infrastructure Setup (Todo 1)

**Created Files:**
- `infra/litellm.config.yaml` - Unified LiteLLM proxy configuration for all 4 providers
  - Ollama models: llama3.1, qwen2.5-coder:7b, nomic-embed-text
  - OpenAI models: gpt-4o, gpt-4o-mini, text-embedding-3-small
  - DeepSeek models: deepseek-chat, deepseek-coder
  - Gemini models: gemini-2.0-flash, gemini-1.5-pro
  - Router settings with model aliases and fallback chains

- `scripts/setup-phase3.sh` - Automated installation script
  - Checks Ollama installation and service status
  - Pulls required models (llama3.1, qwen2.5-coder:7b, nomic-embed-text)
  - Installs LiteLLM proxy via pip
  - Installs Node.js dependencies
  - Provides next-steps guidance

**Package Updates:**
- Added `ollama@^0.5.9` to package.json dependencies

### 2. Provider Adapters (Todo 2)

**Created three integration paths:**

**A) OpenAI-Compatible Adapter** (`src/clients/ollama-openai.ts`)
- Drop-in replacement using OpenAI SDK pointed at Ollama's `/v1` endpoint
- Functions: `chatOllama()`, `chatOllamaSync()`, `isOllamaHealthy()`, `listOllamaModels()`
- Use case: Quick wins, backwards compatibility

**B) Native Ollama Client** (`src/clients/ollama-native.ts`)
- Uses Ollama's native JavaScript client for advanced features
- **Structured Outputs**: `chatOllamaStructured()` with JSON Schema validation
- **Tool Calling**: `chatOllamaTools()` with streaming support
- **Embeddings**: `embedOllama()`, `embedOllamaBatch()` for RAG
- **Model Management**: `pullModel()`, `listModels()`, `showModel()`, `deleteModel()`
- Use case: When you need structured outputs, tool calling, or embeddings

**C) LiteLLM Proxy Client** (`src/clients/litellm-proxy.ts`)
- Unified gateway for all 4 providers (recommended for production)
- **Smart Routing**: `selectModel()` function with task-based selection
- **Model Mapping**: Pre-configured models for each provider and task type
- **Routing Preferences**: Support for `offlineOnly`, `taskType`, `requireJSON`, `requireTools`
- Functions: `chatLiteLLM()`, `embedLiteLLM()`, `checkProxyHealth()`, `listProxyModels()`
- Use case: Production deployments with centralized logging, caching, and fallback

### 3. Environment & Configuration (Todo 6)

**Updated `.env.example`:**
```bash
# Ollama (local models)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.1

# LiteLLM Proxy (unified gateway)
LITELLM_URL=http://localhost:4000
LITELLM_API_KEY=proxy

# Routing preferences
OVERMIND_ROUTING_STRATEGY=cost-optimized  # or local-first
OVERMIND_PREFER_LOCAL=false
OVERMIND_OFFLINE_MODE=false
OVERMIND_ENABLE_FALLBACK=true
```

**Updated `api/app/config.py`:**
- Added Ollama configuration fields (`ollama_base_url`, `ollama_default_model`)
- Added LiteLLM proxy fields (`litellm_url`, `litellm_api_key`)
- Added routing preferences (`routing_strategy`, `prefer_local`, `offline_mode`, `enable_fallback`)

**Updated `src/config.ts`:**
- Load Ollama and LiteLLM settings from environment
- Updated `getAvailableProviders()` to include Ollama and LiteLLM
- Validate at least one provider is configured

**Updated `src/types.ts`:**
- Added `OLLAMA` and `LITELLM` to `LLMProvider` enum
- Added `LOCAL_FIRST` to `RoutingStrategy` enum
- Added `ollama` and `litellm` provider configs to `OvermindConfigSchema`
- Added `preferLocal` and `offlineMode` to routing config

### 4. Router Policy Upgrade (Todo 3)

**Created `src/router/policy.ts`:**

**Core Functions:**
- `selectProvider()` - Smart provider selection based on task requirements
  - Considers: task type, complexity, JSON needs, tool needs, offline mode, latency/cost thresholds
  - Applies routing strategies: cost-optimized, latency-optimized, cascading, predictive, local-first
  - Health-aware routing with fallback support

- `buildFallbackChain()` - Creates provider fallback chains
  - Example (code task): Ollama → DeepSeek → OpenAI
  - Example (quick task): DeepSeek → Ollama → Gemini

- `predictProvider()` - Task-based routing logic
  - `code` → Ollama (qwen2.5-coder)
  - `quick` → DeepSeek (fast + cheap)
  - `creative` → Gemini (creative tasks)
  - `rag` → Ollama (local embeddings)

**Provider Capabilities Matrix:**
```typescript
{
  OPENAI:   { supportsJSON: true, supportsTools: true, supportsVision: true,  isLocal: false, avgLatency: 1500ms, avgCost: $2.50 },
  DEEPSEEK: { supportsJSON: true, supportsTools: true, supportsVision: false, isLocal: false, avgLatency: 800ms,  avgCost: $0.14 },
  GEMINI:   { supportsJSON: true, supportsTools: true, supportsVision: true,  isLocal: false, avgLatency: 1200ms, avgCost: $0.30 },
  OLLAMA:   { supportsJSON: true, supportsTools: true, supportsVision: false, isLocal: true,  avgLatency: 2000ms, avgCost: $0.00 },
  LITELLM:  { supportsJSON: true, supportsTools: true, supportsVision: true,  isLocal: false, avgLatency: 1000ms, avgCost: $1.00 },
}
```

**Task Requirements Interface:**
```typescript
{
  taskType?: 'quick' | 'creative' | 'code' | 'rag' | 'general',
  complexity?: TaskComplexity,
  requireJSON?: boolean,
  requireTools?: boolean,
  offlineOnly?: boolean,
  maxLatency?: number,
  maxCost?: number,
  preferProvider?: LLMProvider,
}
```

---

## 📁 File Inventory

### Created (8 files)
1. `infra/litellm.config.yaml` (181 lines)
2. `scripts/setup-phase3.sh` (114 lines)
3. `src/clients/ollama-openai.ts` (109 lines)
4. `src/clients/ollama-native.ts` (236 lines)
5. `src/clients/litellm-proxy.ts` (260 lines)
6. `src/router/policy.ts` (363 lines)

### Modified (5 files)
7. `.env.example` - Added Ollama/LiteLLM variables
8. `package.json` - Added `ollama` dependency
9. `api/app/config.py` - Added provider configs
10. `src/config.ts` - Load new provider settings
11. `src/types.ts` - Updated enums and schemas

**Total**: 13 files touched, ~1,263 lines added/modified

---

## 🚀 Quick Start Guide

### 1. Run the Setup Script
```bash
cd GoblinOS/packages/goblins/overmind
chmod +x scripts/setup-phase3.sh
./scripts/setup-phase3.sh
```

This will:
- ✅ Check Ollama installation
- ✅ Pull models (llama3.1, qwen2.5-coder:7b, nomic-embed-text)
- ✅ Install LiteLLM proxy
- ✅ Install Node.js dependencies

### 2. Start LiteLLM Proxy
```bash
litellm --config infra/litellm.config.yaml --port 4000
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY
# - DEEPSEEK_API_KEY
# - GEMINI_API_KEY
```

### 4. Test Provider Selection
```typescript
import { selectProvider } from './src/router/policy.js';
import { loadConfig } from './src/config.js';

const config = loadConfig();

// Example 1: Code task (offline)
const codeTask = selectProvider(config, {
  taskType: 'code',
  offlineOnly: true,
  requireTools: true
});
// Result: { provider: 'ollama', model: 'qwen2.5-coder:7b', reason: 'Offline mode - using local Ollama' }

// Example 2: Quick task (cost-optimized)
const quickTask = selectProvider(config, {
  taskType: 'quick',
  maxCost: 0.20
});
// Result: { provider: 'deepseek', model: 'deepseek-chat', reason: 'Cost-optimized: $0.14/1M tokens' }

// Example 3: Creative task with JSON
const creativeTask = selectProvider(config, {
  taskType: 'creative',
  requireJSON: true,
  requireTools: true
});
// Result: { provider: 'gemini', model: 'gemini-2.0-flash-exp', reason: 'Predictive: creative task → gemini' }
```

---

## 🎯 Next Steps (Todos 4-11)

### Todo 4: Structured Outputs & Tool Calling
- [ ] Implement unified tool calling interface
- [ ] Add JSON Schema validation wrappers
- [ ] Create example tools (weather, web search, memory retrieval)

### Todo 5: Local RAG Pipeline
- [ ] Create `src/rag/embeddings.ts`
- [ ] Integrate Chroma/Pinecone vector DB
- [ ] Implement top-k retrieval with scoring
- [ ] Add RAG context injection

### Todo 7-9: Dashboard Panels
- [ ] Model Manager UI (list/pull/show Ollama models)
- [ ] Router Analytics Panel (decisions, latency, fallbacks)
- [ ] RAG Explorer (chunks, embeddings, relevance tuning)

### Todo 10-11: Testing & Docs
- [ ] Integration tests for all adapters
- [ ] Health check tests with fallback scenarios
- [ ] Create PHASE3_OLLAMA.md migration guide
- [ ] Update API_KEYS_MANAGEMENT.md

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Overmind Router                          │
│                  (src/router/policy.ts)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────┐      │
│  │ selectProvider(requirements) → { provider, ... } │      │
│  │  • Task type analysis                           │      │
│  │  • Health checks                                │      │
│  │  • Cost/latency optimization                    │      │
│  │  • Fallback chains                              │      │
│  └─────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ ollama-openai  │  │ ollama-native  │  │ litellm-proxy  │
│ (OpenAI SDK)   │  │ (Native Client)│  │ (Unified API)  │
└────────────────┘  └────────────────┘  └────────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Ollama Server  │  │ Ollama Server  │  │ LiteLLM Proxy  │
│ :11434         │  │ :11434         │  │ :4000          │
└────────────────┘  └────────────────┘  └────────────────┘
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
        ┌──────────────────┼──────────────────┬──────────────┐
        ▼                  ▼                  ▼              ▼
   llama3.1         qwen2.5-coder      nomic-embed    Cloud APIs
  (general)           (code)          (embeddings)   (OpenAI/etc)
```

---

## 💡 Key Design Decisions

1. **Three Integration Paths** - Flexibility for different use cases:
   - Quick drop-in (OpenAI-compat)
   - Advanced features (Native client)
   - Production gateway (LiteLLM proxy)

2. **Health-Aware Routing** - Provider health checks before selection
   - Automatic fallback on provider failures
   - Configurable fallback chains per task type

3. **Local-First Option** - Prefer local Ollama when possible
   - Zero API costs for development
   - Privacy for sensitive workloads
   - Offline capability

4. **Cost & Latency Awareness** - Provider selection considers:
   - Average cost per 1M tokens
   - Average latency (ms)
   - Capability matrix (JSON, tools, vision)

5. **Task-Based Routing** - Predictive routing based on task characteristics:
   - `code` → Ollama (qwen2.5-coder) - specialized for coding
   - `quick` → DeepSeek - fast + cheap
   - `creative` → Gemini - creative tasks
   - `rag` → Ollama - local embeddings

---

## 🔧 Troubleshooting

### Ollama Not Starting
```bash
# Check if Ollama is running
ollama list

# Start Ollama service (macOS)
brew services start ollama

# Or run directly
ollama serve
```

### LiteLLM Proxy Errors
```bash
# Verify config syntax
cat infra/litellm.config.yaml | yq

# Check proxy health
curl http://localhost:4000/health

# View proxy logs
litellm --config infra/litellm.config.yaml --port 4000 --debug
```

### Missing Dependencies
```bash
# Install Ollama
brew install ollama  # macOS
# or visit https://ollama.com/download

# Install LiteLLM
pip install "litellm[proxy]"

# Install Node.js packages
pnpm install
```

---

**Status**: Foundation complete! Ready to proceed with structured outputs, RAG pipeline, and dashboard panels.
