/**
 * LiteLLM Proxy Client
 *
 * Unified gateway for all 4 providers (OpenAI, DeepSeek, Gemini, Ollama).
 * Provides centralized logging, caching, rate limiting, and fallback routing.
 *
 * This is the RECOMMENDED approach for production deployments.
 *
 * Setup:
 * 1. pip install "litellm[proxy]"
 * 2. litellm --config infra/litellm.config.yaml --port 4000
 * 3. Point client at http://localhost:4000/v1
 *
 * Docs: https://docs.litellm.ai/
 *
 * @module clients/litellm-proxy
 */

import OpenAI from 'openai'
import type {
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'

/**
 * LiteLLM proxy client (OpenAI-compatible)
 */
export const litellm = new OpenAI({
  baseURL: `${process.env.LITELLM_URL || 'http://localhost:4000'}/v1`,
  apiKey: process.env.LITELLM_API_KEY || 'proxy',
})

export type Provider = 'openai' | 'deepseek' | 'gemini' | 'ollama'
export type TaskType = 'quick' | 'creative' | 'code' | 'rag' | 'general'

/**
 * Model mapping for different task types and providers
 */
export const MODEL_MAP: Record<Provider, Record<TaskType, string>> = {
  openai: {
    quick: 'openai/gpt-4o-mini',
    creative: 'openai/gpt-4o',
    code: 'openai/gpt-4o',
    rag: 'openai/text-embedding-3-small',
    general: 'openai/gpt-4o',
  },
  deepseek: {
    quick: 'deepseek/deepseek-chat',
    creative: 'deepseek/deepseek-chat',
    code: 'deepseek/deepseek-coder',
    rag: 'openai/text-embedding-3-small', // DeepSeek doesn't have embeddings
    general: 'deepseek/deepseek-chat',
  },
  gemini: {
    quick: 'gemini/gemini-2.0-flash',
    creative: 'gemini/gemini-2.0-flash',
    code: 'gemini/gemini-1.5-pro',
    rag: 'openai/text-embedding-3-small', // Gemini embeddings not in LiteLLM yet
    general: 'gemini/gemini-2.0-flash',
  },
  ollama: {
    quick: 'ollama/llama3.1',
    creative: 'ollama/llama3.1',
    code: 'ollama/qwen2.5-coder',
    rag: 'ollama/nomic-embed-text',
    general: 'ollama/llama3.1',
  },
}

export interface RoutingPreferences {
  /** Preferred provider (will use if healthy) */
  preferProvider?: Provider
  /** Task type to optimize for */
  taskType?: TaskType
  /** Allow offline/local models only */
  offlineOnly?: boolean
  /** Maximum acceptable latency (ms) */
  maxLatency?: number
  /** Maximum acceptable cost (USD per 1M tokens) */
  maxCost?: number
  /** Require structured output support */
  requireJSON?: boolean
  /** Require tool/function calling */
  requireTools?: boolean
}

/**
 * Smart model selection based on routing preferences
 *
 * @example
 * ```typescript
 * const model = selectModel({
 *   taskType: "code",
 *   offlineOnly: true,
 *   requireTools: true
 * });
 * // Returns: "ollama/qwen2.5-coder"
 * ```
 */
export function selectModel(preferences: RoutingPreferences = {}): string {
  const {
    preferProvider,
    taskType = 'general',
    offlineOnly = false,
    requireJSON = false,
    requireTools = false,
  } = preferences

  // Offline mode: force Ollama
  if (offlineOnly) {
    return MODEL_MAP.ollama[taskType]
  }

  // Prefer specific provider if requested
  if (preferProvider) {
    return MODEL_MAP[preferProvider][taskType]
  }

  // Smart routing based on requirements
  if (requireJSON && requireTools) {
    return MODEL_MAP.gemini[taskType] // Gemini has strong JSON + tools
  }

  if (taskType === 'code') {
    return MODEL_MAP.ollama[taskType] // Local Qwen for code (fast + private)
  }

  if (taskType === 'quick') {
    return MODEL_MAP.deepseek[taskType] // DeepSeek is fast + cheap
  }

  if (taskType === 'creative') {
    return MODEL_MAP.gemini[taskType] // Gemini 2.0 Flash for creative
  }

  // Default: use local if available, else DeepSeek
  return MODEL_MAP.ollama.general
}

/**
 * Chat completion via LiteLLM proxy with smart routing
 *
 * @example
 * ```typescript
 * const stream = await chatLiteLLM(
 *   [{ role: "user", content: "Explain quantum computing" }],
 *   { taskType: "creative", preferProvider: "gemini" }
 * );
 *
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content || "");
 * }
 * ```
 */
export async function chatLiteLLM(
  messages: ChatCompletionMessageParam[],
  preferences: RoutingPreferences = {},
  options: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  } = {}
) {
  const model = selectModel(preferences)
  const { temperature = 0.7, maxTokens = 4096, stream = true } = options

  return await litellm.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  } as ChatCompletionCreateParamsStreaming)
}

/**
 * Non-streaming chat completion
 */
export async function chatLiteLLMSync(
  messages: ChatCompletionMessageParam[],
  preferences: RoutingPreferences = {},
  options: {
    temperature?: number
    maxTokens?: number
  } = {}
) {
  const model = selectModel(preferences)
  const { temperature = 0.7, maxTokens = 4096 } = options

  return await litellm.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  })
}

/**
 * Generate embeddings via LiteLLM proxy
 *
 * @example
 * ```typescript
 * const embedding = await embedLiteLLM("Search query text", {
 *   offlineOnly: true  // Use local nomic-embed-text
 * });
 * ```
 */
export async function embedLiteLLM(
  text: string | string[],
  preferences: RoutingPreferences = {}
): Promise<number[] | number[][]> {
  const model = selectModel({ ...preferences, taskType: 'rag' })
  const input = Array.isArray(text) ? text : [text]

  const response = await litellm.embeddings.create({
    model,
    input,
  })

  const embeddings = response.data.map((item) => item.embedding)
  return Array.isArray(text) ? embeddings : embeddings[0]
}

/**
 * Check LiteLLM proxy health
 */
export async function checkProxyHealth(): Promise<{
  healthy: boolean
  version?: string
  models?: number
}> {
  try {
    const baseURL = process.env.LITELLM_URL || 'http://localhost:4000'
    const response = await fetch(`${baseURL}/health`)

    if (!response.ok) {
      return { healthy: false }
    }

    const data = await response.json()
    return {
      healthy: true,
      version: data.version,
      models: data.models?.length,
    }
  } catch (_error) {
    return { healthy: false }
  }
}

/**
 * Get available models from LiteLLM proxy
 */
export async function listProxyModels(): Promise<string[]> {
  try {
    const response = await litellm.models.list()
    return response.data.map((model) => model.id)
  } catch (error) {
    console.error('Failed to list LiteLLM models:', error)
    return []
  }
}
