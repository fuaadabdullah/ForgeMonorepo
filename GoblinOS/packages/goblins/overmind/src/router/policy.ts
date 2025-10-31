/**
 * 🧠 Overmind Routing Policy Engine
 *
 * Smart provider selection based on task requirements, cost, latency,
 * and availability. Implements fallback chains and health-aware routing.
 *
 * @module router/policy
 */

import { LLMProvider, RoutingStrategy, TaskComplexity } from '../types.js'
import type { OvermindConfig } from '../types.js'

export interface TaskRequirements {
  /** Task type classification */
  taskType?: 'quick' | 'creative' | 'code' | 'rag' | 'general'
  /** Estimated task complexity */
  complexity?: TaskComplexity
  /** Require structured JSON output */
  requireJSON?: boolean
  /** Require tool/function calling */
  requireTools?: boolean
  /** Allow offline/local models only */
  offlineOnly?: boolean
  /** Maximum acceptable latency (ms) */
  maxLatency?: number
  /** Maximum acceptable cost (USD per 1M tokens) */
  maxCost?: number
  /** Preferred provider (if available) */
  preferProvider?: LLMProvider
}

export interface ProviderCapabilities {
  provider: LLMProvider
  supportsJSON: boolean
  supportsTools: boolean
  supportsVision: boolean
  isLocal: boolean
  avgLatency: number // milliseconds
  avgCost: number // USD per 1M tokens
  healthy: boolean
  lastChecked: Date
}

/**
 * Provider capabilities matrix
 */
const PROVIDER_CAPABILITIES: Record<
  LLMProvider,
  Omit<ProviderCapabilities, 'healthy' | 'lastChecked'>
> = {
  [LLMProvider.OPENAI]: {
    provider: LLMProvider.OPENAI,
    supportsJSON: true,
    supportsTools: true,
    supportsVision: true,
    isLocal: false,
    avgLatency: 1500,
    avgCost: 2.5, // GPT-4o average
  },
  [LLMProvider.DEEPSEEK]: {
    provider: LLMProvider.DEEPSEEK,
    supportsJSON: true,
    supportsTools: true,
    supportsVision: false,
    isLocal: false,
    avgLatency: 800,
    avgCost: 0.14, // DeepSeek-chat
  },
  [LLMProvider.GEMINI]: {
    provider: LLMProvider.GEMINI,
    supportsJSON: true,
    supportsTools: true,
    supportsVision: true,
    isLocal: false,
    avgLatency: 1200,
    avgCost: 0.3, // Gemini 2.0 Flash
  },
  [LLMProvider.OLLAMA]: {
    provider: LLMProvider.OLLAMA,
    supportsJSON: true,
    supportsTools: true,
    supportsVision: false,
    isLocal: true,
    avgLatency: 2000, // Depends on hardware
    avgCost: 0.0, // Free local inference
  },
  [LLMProvider.LITELLM]: {
    provider: LLMProvider.LITELLM,
    supportsJSON: true,
    supportsTools: true,
    supportsVision: true,
    isLocal: false,
    avgLatency: 1000, // Proxy overhead + routing
    avgCost: 1.0, // Varies by backend
  },
}

/**
 * Select the optimal LLM provider based on task requirements
 *
 * @example
 * ```typescript
 * const provider = selectProvider(config, {
 *   taskType: 'code',
 *   offlineOnly: true,
 *   requireTools: true
 * }, providerHealth);
 * // Returns: LLMProvider.OLLAMA (local qwen2.5-coder)
 * ```
 */
export function selectProvider(
  config: OvermindConfig,
  requirements: TaskRequirements = {},
  providerHealth: Map<LLMProvider, boolean> = new Map()
): { provider: LLMProvider; reason: string; model: string } {
  const {
    taskType = 'general',
    complexity = TaskComplexity.MODERATE,
    requireJSON = false,
    requireTools = false,
    offlineOnly = false,
    maxLatency,
    maxCost,
    preferProvider,
  } = requirements

  const { routing } = config

  // Apply offline mode override
  if (offlineOnly || routing.offlineMode) {
    if (!config.providers.ollama) {
      throw new Error('Offline mode requested but Ollama not configured')
    }
    return {
      provider: LLMProvider.OLLAMA,
      reason: 'Offline mode - using local Ollama',
      model: getModelForTask(LLMProvider.OLLAMA, taskType),
    }
  }

  // Apply local-first strategy
  if (routing.strategy === RoutingStrategy.LOCAL_FIRST && config.providers.ollama) {
    const ollamaHealthy = providerHealth.get(LLMProvider.OLLAMA) !== false
    if (ollamaHealthy) {
      return {
        provider: LLMProvider.OLLAMA,
        reason: 'Local-first strategy',
        model: getModelForTask(LLMProvider.OLLAMA, taskType),
      }
    }
  }

  // Apply preferred provider if healthy
  if (preferProvider && isProviderAvailable(config, preferProvider, providerHealth)) {
    return {
      provider: preferProvider,
      reason: `Preferred provider: ${preferProvider}`,
      model: getModelForTask(preferProvider, taskType),
    }
  }

  // Filter providers by requirements
  const candidates = getAvailableProviders(config)
    .map((provider) => ({
      provider,
      caps: PROVIDER_CAPABILITIES[provider],
      healthy: providerHealth.get(provider) !== false,
    }))
    .filter(({ caps, healthy }) => {
      if (!healthy) return false
      if (requireJSON && !caps.supportsJSON) return false
      if (requireTools && !caps.supportsTools) return false
      if (maxLatency && caps.avgLatency > maxLatency) return false
      if (maxCost && caps.avgCost > maxCost) return false
      return true
    })

  if (candidates.length === 0) {
    throw new Error('No providers match requirements. Check health and configuration.')
  }

  // Apply routing strategy
  let selected: LLMProvider
  let reason: string

  switch (routing.strategy) {
    case RoutingStrategy.COST_OPTIMIZED: {
      // Choose cheapest provider
      const cheapest = candidates.reduce((prev, curr) =>
        curr.caps.avgCost < prev.caps.avgCost ? curr : prev
      )
      selected = cheapest.provider
      reason = `Cost-optimized: $${cheapest.caps.avgCost}/1M tokens`
      break
    }

    case RoutingStrategy.LATENCY_OPTIMIZED: {
      // Choose fastest provider
      const fastest = candidates.reduce((prev, curr) =>
        curr.caps.avgLatency < prev.caps.avgLatency ? curr : prev
      )
      selected = fastest.provider
      reason = `Latency-optimized: ${fastest.caps.avgLatency}ms avg`
      break
    }

    case RoutingStrategy.CASCADING:
      // Try cheap first, escalate if needed
      if (complexity === TaskComplexity.SIMPLE || complexity === TaskComplexity.MODERATE) {
        selected = LLMProvider.DEEPSEEK
        reason = 'Cascading: simple task → DeepSeek'
      } else if (complexity === TaskComplexity.COMPLEX) {
        selected = LLMProvider.GEMINI
        reason = 'Cascading: complex task → Gemini'
      } else {
        selected = LLMProvider.OPENAI
        reason = 'Cascading: strategic task → OpenAI'
      }
      break

    case RoutingStrategy.PREDICTIVE:
      // Task-based routing
      selected = predictProvider(taskType, requireJSON, requireTools)
      reason = `Predictive: ${taskType} task → ${selected}`
      break

    default: {
      // Default to cost-optimized
      const cheapestDefault = candidates.reduce((prev, curr) =>
        curr.caps.avgCost < prev.caps.avgCost ? curr : prev
      )
      selected = cheapestDefault.provider
      reason = `Default (cost-optimized): ${selected}`
    }
  }

  // Verify selected provider is in candidates
  if (!candidates.some((c) => c.provider === selected)) {
    // Fallback to first available
    selected = candidates[0].provider
    reason = `Fallback: ${selected} (preferred not available)`
  }

  return {
    provider: selected,
    reason,
    model: getModelForTask(selected, taskType),
  }
}

/**
 * Predictive routing based on task type and requirements
 */
function predictProvider(
  taskType: string,
  requireJSON: boolean,
  requireTools: boolean
): LLMProvider {
  // JSON + Tools → Gemini (strong structured outputs)
  if (requireJSON && requireTools) {
    return LLMProvider.GEMINI
  }

  switch (taskType) {
    case 'code':
      return LLMProvider.OLLAMA // Local qwen2.5-coder
    case 'quick':
      return LLMProvider.DEEPSEEK // Fast + cheap
    case 'creative':
      return LLMProvider.GEMINI // Creative tasks
    case 'rag':
      return LLMProvider.OLLAMA // Local embeddings
    default:
      return LLMProvider.DEEPSEEK // General default
  }
}

/**
 * Get recommended model for a provider and task type
 */
function getModelForTask(provider: LLMProvider, taskType: string): string {
  const modelMap: Record<LLMProvider, Record<string, string>> = {
    [LLMProvider.OPENAI]: {
      quick: 'gpt-4o-mini',
      creative: 'gpt-4o',
      code: 'gpt-4o',
      rag: 'text-embedding-3-small',
      general: 'gpt-4o',
    },
    [LLMProvider.DEEPSEEK]: {
      quick: 'deepseek-chat',
      creative: 'deepseek-chat',
      code: 'deepseek-coder',
      rag: 'deepseek-chat',
      general: 'deepseek-chat',
    },
    [LLMProvider.GEMINI]: {
      quick: 'gemini-2.0-flash-exp',
      creative: 'gemini-2.0-flash-exp',
      code: 'gemini-1.5-pro',
      rag: 'gemini-2.0-flash-exp',
      general: 'gemini-2.0-flash-exp',
    },
    [LLMProvider.OLLAMA]: {
      quick: 'llama3.1',
      creative: 'llama3.1',
      code: 'qwen2.5-coder:7b',
      rag: 'nomic-embed-text',
      general: 'llama3.1',
    },
    [LLMProvider.LITELLM]: {
      quick: 'deepseek/deepseek-chat',
      creative: 'gemini/gemini-2.0-flash',
      code: 'ollama/qwen2.5-coder',
      rag: 'ollama/nomic-embed-text',
      general: 'deepseek/deepseek-chat',
    },
  }

  return modelMap[provider][taskType] || modelMap[provider].general
}

/**
 * Get list of available providers from config
 */
function getAvailableProviders(config: OvermindConfig): LLMProvider[] {
  const providers: LLMProvider[] = []
  if (config.providers.openai) providers.push(LLMProvider.OPENAI)
  if (config.providers.deepseek) providers.push(LLMProvider.DEEPSEEK)
  if (config.providers.gemini) providers.push(LLMProvider.GEMINI)
  if (config.providers.ollama) providers.push(LLMProvider.OLLAMA)
  if (config.providers.litellm) providers.push(LLMProvider.LITELLM)
  return providers
}

/**
 * Check if a provider is configured and healthy
 */
export function isProviderAvailable(
  config: OvermindConfig,
  provider: LLMProvider,
  health?: Map<LLMProvider, boolean>
): boolean {
  const configured = getAvailableProviders(config).includes(provider)
  if (health) {
    const healthy = health.get(provider) !== false
    return configured && healthy
  }
  return configured
}

/**
 * Build fallback chain based on config and requirements
 *
 * @example
 * ```typescript
 * const chain = buildFallbackChain(config, { taskType: 'code' });
 * // Returns: [OLLAMA, DEEPSEEK, OPENAI] (try local first, escalate to cloud)
 * ```
 */
export function buildFallbackChain(
  config: OvermindConfig,
  requirements: TaskRequirements = {}
): LLMProvider[] {
  const available = getAvailableProviders(config)
  const { offlineOnly = false, taskType = 'general' } = requirements

  if (offlineOnly) {
    return available.filter((p) => PROVIDER_CAPABILITIES[p].isLocal)
  }

  // Build chain based on task type
  const chains: Record<string, LLMProvider[]> = {
    code: [LLMProvider.OLLAMA, LLMProvider.DEEPSEEK, LLMProvider.OPENAI],
    quick: [LLMProvider.DEEPSEEK, LLMProvider.OLLAMA, LLMProvider.GEMINI],
    creative: [LLMProvider.GEMINI, LLMProvider.OPENAI, LLMProvider.DEEPSEEK],
    rag: [LLMProvider.OLLAMA, LLMProvider.OPENAI],
    general: [LLMProvider.DEEPSEEK, LLMProvider.OLLAMA, LLMProvider.GEMINI, LLMProvider.OPENAI],
  }

  const chain = chains[taskType] || chains.general
  return chain.filter((p) => available.includes(p))
}
