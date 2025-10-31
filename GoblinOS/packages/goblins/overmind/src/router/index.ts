/**
 * 🔀 Intelligent LLM Router
 *
 * Routes queries to optimal LLM providers based on:
 * - Task complexity classification
 * - Cost optimization (up to 85% savings via smaller models)
 * - Latency requirements
 * - Provider health and failover
 *
 * Implements routing strategies from IBM Research and RedHat patterns.
 *
 * @see https://research.ibm.com (multi-model routing)
 * @module @goblinos/overmind/router
 */

import { trace, tracingUtils } from '../../observability/tracing.js'
import { GuildLiteBrainEnforcer } from '../guild-enforcement.js'
import { estimateSavings, selectModel } from '../providers/ollama.js'
import type { OvermindConfig, RouterDecision, RoutingStrategy, TaskComplexity } from '../types.js'
import {
  TaskComplexity as Complexity,
  type LLMProvider,
  LLMProvider as Provider,
} from '../types.js'
import { isProviderAvailable } from './policy.js'

/**
 * Tracer for routing operations
 */
const tracer = trace.getTracer('overmind-routing')

/**
 * Cost per 1M tokens (USD) - approximate values as of Oct 2025
 */
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // DeepSeek (cost-effective)
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-coder': { input: 0.14, output: 0.28 },

  // Gemini
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },

  // Ollama (local, no cost)
  'qwen2.5:3b': { input: 0, output: 0 },
  'qwen2.5-coder:3b': { input: 0, output: 0 },
}

/**
 * Average latency (ms) - based on typical response times
 */
const MODEL_LATENCY: Record<string, number> = {
  'gpt-4o-mini': 800,
  'gpt-4o': 1500,
  'gpt-4-turbo': 2000,
  'gpt-3.5-turbo': 600,
  'deepseek-chat': 1000,
  'deepseek-coder': 1200,
  'gemini-2.0-flash': 500,
  'gemini-1.5-flash': 600,
  'gemini-1.5-pro': 1800,
  // Ollama (local inference, typically faster)
  'qwen2.5:3b': 300,
  'qwen2.5-coder:3b': 350,
}

/**
 * Model capabilities for task complexity
 */
const MODEL_CAPABILITIES: Record<
  TaskComplexity,
  Array<{ provider: LLMProvider; model: string; score: number }>
> = {
  simple: [
    { provider: Provider.DEEPSEEK, model: 'deepseek-chat', score: 10 },
    { provider: Provider.GEMINI, model: 'gemini-2.0-flash', score: 9 },
    { provider: Provider.OPENAI, model: 'gpt-4o-mini', score: 8 },
    { provider: Provider.OPENAI, model: 'gpt-3.5-turbo', score: 7 },
    { provider: Provider.OLLAMA, model: 'qwen2.5:3b', score: 6 }, // Local fallback
  ],
  moderate: [
    { provider: Provider.GEMINI, model: 'gemini-1.5-flash', score: 10 },
    { provider: Provider.OPENAI, model: 'gpt-4o-mini', score: 9 },
    { provider: Provider.DEEPSEEK, model: 'deepseek-chat', score: 8 },
    { provider: Provider.OPENAI, model: 'gpt-4o', score: 7 },
    { provider: Provider.OLLAMA, model: 'qwen2.5:3b', score: 6 },
  ],
  complex: [
    { provider: Provider.OPENAI, model: 'gpt-4o', score: 10 },
    { provider: Provider.GEMINI, model: 'gemini-1.5-pro', score: 9 },
    { provider: Provider.OPENAI, model: 'gpt-4-turbo', score: 8 },
    { provider: Provider.GEMINI, model: 'gemini-1.5-flash', score: 7 },
    { provider: Provider.OLLAMA, model: 'qwen2.5-coder:3b', score: 5 }, // For code-related complex tasks
  ],
  strategic: [
    { provider: Provider.OPENAI, model: 'gpt-4o', score: 10 },
    { provider: Provider.OPENAI, model: 'gpt-4-turbo', score: 9 },
    { provider: Provider.GEMINI, model: 'gemini-1.5-pro', score: 8 },
    { provider: Provider.OPENAI, model: 'gpt-4o-mini', score: 6 },
    { provider: Provider.OLLAMA, model: 'qwen2.5:3b', score: 4 }, // Use general model for strategic planning
  ],
}

/**
 * Classify task complexity from prompt
 * Uses heuristics: keywords, length, question types
 */
export function classifyComplexity(prompt: string): TaskComplexity {
  return tracer.startActiveSpan('classifyComplexity', (span: any) => {
    try {
      span.setAttribute('message.length', prompt.length)
      span.setAttribute('message.complexity', 'unknown') // Will be updated

      const lowerPrompt = prompt.toLowerCase()

      // Strategic keywords
      const strategicKeywords = [
        'plan',
        'strategy',
        'architect',
        'design',
        'multi-step',
        'orchestrate',
        'coordinate',
        'roadmap',
        'comprehensive',
      ]

      // Complex keywords
      const complexKeywords = [
        'analyze',
        'compare',
        'evaluate',
        'reason',
        'creative',
        'generate code',
        'refactor',
        'optimize',
        'debug',
      ]

      // Simple indicators
      const simpleKeywords = [
        'what is',
        'define',
        'list',
        'when was',
        'who is',
        'simple',
        'basic',
        'quick',
        'fact',
      ]

      // Check for strategic work
      if (strategicKeywords.some((kw) => lowerPrompt.includes(kw))) {
        span.setAttribute('message.complexity', 'strategic')
        return Complexity.STRATEGIC
      }

      // Check for complex reasoning
      if (complexKeywords.some((kw) => lowerPrompt.includes(kw))) {
        span.setAttribute('message.complexity', 'complex')
        return Complexity.COMPLEX
      }

      // Check for simple queries
      if (simpleKeywords.some((kw) => lowerPrompt.includes(kw)) || prompt.length < 100) {
        span.setAttribute('message.complexity', 'simple')
        return Complexity.SIMPLE
      }

      // Default to moderate
      span.setAttribute('message.complexity', 'moderate')
      return Complexity.MODERATE
    } finally {
      span.end()
    }
  })
}

/**
 * Detect task type for model selection
 */
export function detectTaskType(prompt: string): 'chat' | 'code' | 'embedding' {
  const lowerPrompt = prompt.toLowerCase()

  // Code-related keywords
  const codeKeywords = [
    'code',
    'function',
    'class',
    'javascript',
    'typescript',
    'python',
    'java',
    'c++',
    'rust',
    'go',
    'sql',
    'html',
    'css',
    'json',
    'yaml',
    'xml',
    'regex',
    'algorithm',
    'debug',
    'refactor',
    'implement',
    'api',
    'endpoint',
    'database',
    'query',
  ]

  // Embedding/semantic search keywords
  const embeddingKeywords = [
    'similar',
    'related',
    'search',
    'find',
    'retrieve',
    'semantic',
    'vector',
    'embedding',
    'context',
    'relevant',
    'match',
  ]

  if (codeKeywords.some((kw) => lowerPrompt.includes(kw))) {
    return 'code'
  }

  if (embeddingKeywords.some((kw) => lowerPrompt.includes(kw))) {
    return 'embedding'
  }

  return 'chat'
}

/**
 * Calculate estimated cost for a request
 */
function estimateCost(model: string, inputTokens: number, outputTokens = 500): number {
  const costs = MODEL_COSTS[model]
  if (!costs) return 0

  return (costs.input * inputTokens) / 1_000_000 + (costs.output * outputTokens) / 1_000_000
}

/**
 * Get default model for a provider
 */
function getDefaultModelForProvider(provider: LLMProvider): string {
  switch (provider) {
    case Provider.OPENAI:
      return 'gpt-4o-mini'
    case Provider.DEEPSEEK:
      return 'deepseek-chat'
    case Provider.GEMINI:
      return 'gemini-2.0-flash'
    case Provider.OLLAMA:
      return 'qwen2.5:3b'
    default:
      return 'gpt-4o-mini' // fallback
  }
}

/**
 * Cost-optimized routing: minimize cost while meeting quality bar
 */
function routeCostOptimized(
  complexity: TaskComplexity,
  config: OvermindConfig,
  inputTokens: number
): { provider: LLMProvider; model: string; reason: string } {
  const candidates = MODEL_CAPABILITIES[complexity]

  // Filter by available providers
  const available = candidates.filter((c) => isProviderAvailable(config, c.provider))

  if (available.length === 0) {
    throw new Error('No LLM providers available')
  }

  // Sort by cost (ascending)
  const sorted = available.sort((a, b) => {
    const costA = estimateCost(a.model, inputTokens)
    const costB = estimateCost(b.model, inputTokens)
    return costA - costB
  })

  // Pick cheapest with score >= 7
  const best = sorted.find((c) => c.score >= 7) || sorted[0]

  return {
    provider: best.provider,
    model: best.model,
    reason: `Cost-optimized: ${best.model} offers best price/performance for ${complexity} tasks`,
  }
}

/**
 * Latency-optimized routing: minimize response time
 */
function routeLatencyOptimized(
  complexity: TaskComplexity,
  config: OvermindConfig
): { provider: LLMProvider; model: string; reason: string } {
  const candidates = MODEL_CAPABILITIES[complexity]

  const available = candidates.filter((c) => isProviderAvailable(config, c.provider))

  if (available.length === 0) {
    throw new Error('No LLM providers available')
  }

  // Sort by latency (ascending)
  const sorted = available.sort((a, b) => {
    const latA = MODEL_LATENCY[a.model] || 2000
    const latB = MODEL_LATENCY[b.model] || 2000
    return latA - latB
  })

  const best = sorted[0]

  return {
    provider: best.provider,
    model: best.model,
    reason: `Latency-optimized: ${best.model} provides fastest response for ${complexity} tasks`,
  }
}

/**
 * Cascading router: try cheap models first, escalate if needed
 * This is the "try fast small models first" strategy from IBM research
 */
function routeCascading(
  complexity: TaskComplexity,
  config: OvermindConfig,
  attempt = 1
): { provider: LLMProvider; model: string; reason: string } {
  const candidates = MODEL_CAPABILITIES[complexity]

  const available = candidates.filter((c) => isProviderAvailable(config, c.provider))

  if (available.length === 0) {
    throw new Error('No LLM providers available')
  }

  // On first attempt, use cheapest; on retry, escalate to better models
  const index = Math.min(attempt - 1, available.length - 1)
  const selected = available.sort((a, b) => {
    const costA = MODEL_COSTS[a.model]?.input || 0
    const costB = MODEL_COSTS[b.model]?.input || 0
    return costA - costB
  })[index]

  return {
    provider: selected.provider,
    model: selected.model,
    reason: `Cascading (attempt ${attempt}): trying ${selected.model}`,
  }
}

/**
 * Local-first routing: prefer Ollama for cost/privacy, fallback to cloud
 */
function routeLocalFirst(
  complexity: TaskComplexity,
  config: OvermindConfig,
  prompt: string,
  monthlyVolume = 1000
): { provider: LLMProvider; model: string; reason: string; savings?: number } {
  return tracer.startActiveSpan('routeLocalFirst', (span: any) => {
    try {
      // First, try Ollama if available
      if (isProviderAvailable(config, Provider.OLLAMA)) {
        const taskType = detectTaskType(prompt)
        const costThreshold = config.routing.costThresholds.medium // Use medium threshold for local-first routing
        const ollamaModel = selectModel(taskType)

        // Add Ollama selection attributes
        tracingUtils.addOllamaSelectionAttributes(span, ollamaModel, taskType, costThreshold)

        // Check if we should use Ollama based on volume threshold
        if (monthlyVolume < costThreshold) {
          // For low volume, prefer Ollama for cost savings
          const decision = {
            provider: Provider.OLLAMA,
            model: ollamaModel,
            reason: `Local-first: using Ollama ${ollamaModel} for cost savings (volume: ${monthlyVolume} < threshold: ${costThreshold})`,
          }
          tracingUtils.addRoutingAttributes(span, decision)
          return decision
        }
        // For high volume, still consider Ollama but calculate savings
        const cloudFallback = routeCostOptimized(complexity, config, Math.ceil(prompt.length / 4))
        const savings = estimateSavings(
          cloudFallback.model,
          Math.ceil(prompt.length / 4),
          500,
          monthlyVolume
        )

        if (savings.savings > 10) {
          // If savings > $10/month, use Ollama
          const decision = {
            provider: Provider.OLLAMA,
            model: ollamaModel,
            reason: `Local-first: using Ollama ${ollamaModel} for $${savings.savings.toFixed(2)} monthly savings`,
            savings: savings.savings,
          }
          tracingUtils.addRoutingAttributes(span, { ...decision, savings: undefined }) // Don't pass savings to avoid duplication
          tracingUtils.addSavingsAttributes(span, savings)
          return decision
        }
      }

      // Fallback to cost-optimized cloud routing
      const cloudDecision = routeCostOptimized(complexity, config, Math.ceil(prompt.length / 4))
      const decision = {
        provider: cloudDecision.provider,
        model: cloudDecision.model,
        reason: `Local-first fallback: ${cloudDecision.reason}`,
      }
      tracingUtils.addRoutingAttributes(span, decision)
      return decision
    } finally {
      span.end()
    }
  })
}

/**
 * Predictive router: use ML model to predict best LLM
 * (Simplified version - would use trained model in production)
 */
function routePredictive(
  complexity: TaskComplexity,
  config: OvermindConfig,
  inputTokens: number
): { provider: LLMProvider; model: string; reason: string } {
  // For now, use a scoring function (in prod, this would be ML model)
  const candidates = MODEL_CAPABILITIES[complexity]

  const available = candidates.filter((c) => isProviderAvailable(config, c.provider))

  if (available.length === 0) {
    throw new Error('No LLM providers available')
  }

  // Score based on: capability score, cost, latency
  const scored = available.map((c) => {
    const cost = estimateCost(c.model, inputTokens)
    const latency = MODEL_LATENCY[c.model] || 2000

    // Weighted score: 50% capability, 30% cost, 20% latency
    const score = c.score * 0.5 + (1 / (cost + 0.001)) * 0.3 + (1 / (latency / 1000)) * 0.2

    return { ...c, finalScore: score }
  })

  const best = scored.sort((a, b) => b.finalScore - a.finalScore)[0]

  return {
    provider: best.provider,
    model: best.model,
    reason: `Predictive routing: ${best.model} predicted best for ${complexity} (score: ${best.finalScore.toFixed(2)})`,
  }
}

/**
 * Main router: select optimal LLM for a given query
 */
export function routeQuery(
  prompt: string,
  config: OvermindConfig,
  options: {
    strategy?: RoutingStrategy
    complexity?: TaskComplexity
    inputTokens?: number
    attempt?: number
    guildId?: string
    goblinId?: string
  } = {}
): RouterDecision {
  return tracer.startActiveSpan('routeQuery', (span: any) => {
    try {
      const strategy = options.strategy || config.routing.strategy
      const complexity = options.complexity || classifyComplexity(prompt)
      const inputTokens = options.inputTokens || Math.ceil(prompt.length / 4) // rough estimate
      const attempt = options.attempt || 1
      const guildId = options.guildId
      const goblinId = options.goblinId

      span.setAttribute('routing.strategy', strategy)
      span.setAttribute('message.length', prompt.length)
      span.setAttribute('message.complexity', complexity)
      span.setAttribute('routing.attempt', attempt)
      if (guildId) span.setAttribute('guild.id', guildId)
      if (goblinId) span.setAttribute('goblin.id', goblinId)

      let decision: { provider: LLMProvider; model: string; reason: string }

      switch (strategy) {
        case 'cost-optimized':
          decision = routeCostOptimized(complexity, config, inputTokens)
          break
        case 'latency-optimized':
          decision = routeLatencyOptimized(complexity, config)
          break
        case 'cascading':
          decision = routeCascading(complexity, config, attempt)
          break
        case 'local-first':
          decision = routeLocalFirst(complexity, config, prompt)
          break
        case 'predictive':
          decision = routePredictive(complexity, config, inputTokens)
          break
        default:
          // Fallback to cost-optimized
          decision = routeCostOptimized(complexity, config, inputTokens)
      }

      // Enforce guild litebrain restrictions if guild context provided
      if (guildId && goblinId) {
        const enforcer = new GuildLiteBrainEnforcer()
        const validation = enforcer.validate(guildId, goblinId, decision.provider, decision.model)

        if (!validation.valid) {
          span.recordException(new Error(`Guild litebrain violation: ${validation.error}`))
          span.setAttribute('guild.violation', true)
          span.setAttribute('guild.violation_reason', validation.error)

          // Try to find an allowed alternative
          const allowedBrains = enforcer.getAllowedBrains(guildId, goblinId)
          if (allowedBrains) {
            // Try local models first
            for (const localModel of allowedBrains.local) {
              if (isProviderAvailable(config, Provider.OLLAMA)) {
                decision = {
                  provider: Provider.OLLAMA,
                  model: localModel,
                  reason: `Guild enforcement: switched to allowed local model ${localModel} (${validation.error})`,
                }
                break
              }
            }

            // If no local models available, try routers
            if (decision.provider !== Provider.OLLAMA) {
              for (const router of allowedBrains.routers) {
                // Map router names to providers (simplified mapping)
                let provider: LLMProvider | null = null
                if (router.toLowerCase().includes('deepseek')) provider = Provider.DEEPSEEK
                else if (router.toLowerCase().includes('openai')) provider = Provider.OPENAI
                else if (router.toLowerCase().includes('gemini')) provider = Provider.GEMINI

                if (provider && isProviderAvailable(config, provider)) {
                  // Use a reasonable default model for the provider
                  const defaultModel = getDefaultModelForProvider(provider)
                  decision = {
                    provider,
                    model: defaultModel,
                    reason: `Guild enforcement: switched to allowed router ${router} (${validation.error})`,
                  }
                  break
                }
              }
            }
          }

          // If we still don't have a valid decision, throw an error
          const finalValidation = enforcer.validate(
            guildId,
            goblinId,
            decision.provider,
            decision.model
          )
          if (!finalValidation.valid) {
            throw new Error(
              `No allowed litebrain available for goblin ${goblinId} in guild ${guildId}: ${finalValidation.error}`
            )
          }
        }

        span.setAttribute('guild.enforced', true)
      }

      span.setAttribute('routing.provider', decision.provider)
      span.setAttribute('routing.model', decision.model)
      span.setAttribute('routing.reason', decision.reason)

      const routerDecision: RouterDecision = {
        selectedProvider: decision.provider,
        selectedModel: decision.model,
        reason: decision.reason,
        estimatedCost: estimateCost(decision.model, inputTokens),
        estimatedLatency: MODEL_LATENCY[decision.model] || 2000,
        complexity,
        timestamp: new Date(),
      }

      span.setAttribute('routing.estimated_cost', routerDecision.estimatedCost)
      span.setAttribute('routing.estimated_latency', routerDecision.estimatedLatency)

      return routerDecision
    } finally {
      span.end()
    }
  })
}

/**
 * Get failover provider when primary fails
 */
export function getFailoverProvider(
  config: OvermindConfig,
  failedProvider: LLMProvider,
  complexity: TaskComplexity
): { provider: LLMProvider; model: string } | null {
  return tracer.startActiveSpan('getFailoverProvider', (span: any) => {
    try {
      span.setAttribute('routing.failed_provider', failedProvider)
      span.setAttribute('message.complexity', complexity)

      if (!config.routing.enableFailover) {
        span.setAttribute('routing.failover_enabled', false)
        return null
      }

      span.setAttribute('routing.failover_enabled', true)

      const candidates = MODEL_CAPABILITIES[complexity]

      // Find alternative provider
      const alternative = candidates.find(
        (c) => c.provider !== failedProvider && isProviderAvailable(config, c.provider)
      )

      if (alternative) {
        span.setAttribute('routing.failover_provider', alternative.provider)
        span.setAttribute('routing.failover_model', alternative.model)
        return { provider: alternative.provider, model: alternative.model }
      }

      span.setAttribute('routing.failover_available', false)
      return null
    } finally {
      span.end()
    }
  })
}

export { isProviderAvailable }
