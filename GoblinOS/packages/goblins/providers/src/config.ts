import { z } from 'zod'

/**
 * Provider configuration schema
 */
export const ProviderConfigSchema = z.object({
  /** Base URL for LiteLLM gateway or OpenAI-compatible endpoint */
  baseURL: z.string().url(),

  /** API key (can be dummy for LiteLLM) */
  apiKey: z.string().default('dummy'),

  /** Default model to use */
  defaultModel: z.string().default('gpt-4-turbo'),

  /** Fallback models in priority order */
  fallbackModels: z.array(z.string()).default(['deepseek-r1', 'gpt-4-turbo', 'gemini-pro']),

  /** Maximum retries per model */
  maxRetries: z.number().int().positive().default(3),

  /** Request timeout in milliseconds */
  timeout: z.number().int().positive().default(60000),

  /** Enable telemetry */
  telemetry: z.boolean().default(true),

  /** Cost tracking enabled */
  trackCost: z.boolean().default(true),

  /** Maximum tokens per request */
  maxTokens: z.number().int().positive().optional(),

  /** Temperature for sampling */
  temperature: z.number().min(0).max(2).default(0.7),
})

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>

/**
 * Model metadata for cost/latency tracking
 */
export interface ModelMetadata {
  provider: string
  model: string
  inputCostPer1kTokens: number
  outputCostPer1kTokens: number
  avgLatencyMs: number
}

/**
 * Known model metadata (approximate costs as of Oct 2025)
 */
export const MODEL_METADATA: Record<string, ModelMetadata> = {
  'gpt-4-turbo': {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    inputCostPer1kTokens: 0.01,
    outputCostPer1kTokens: 0.03,
    avgLatencyMs: 2000,
  },
  'gemini-pro': {
    provider: 'gemini',
    model: 'gemini-1.5-pro-latest',
    inputCostPer1kTokens: 0.0035,
    outputCostPer1kTokens: 0.0105,
    avgLatencyMs: 1500,
  },
  'deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    inputCostPer1kTokens: 0.0014,
    outputCostPer1kTokens: 0.0028,
    avgLatencyMs: 1200,
  },
  'deepseek-r1': {
    provider: 'deepseek',
    model: 'deepseek-r1',
    inputCostPer1kTokens: 0.002,
    outputCostPer1kTokens: 0.004,
    avgLatencyMs: 1800,
  },
  ollama: {
    provider: 'ollama',
    model: 'ollama',
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    avgLatencyMs: 450,
  },
  'ollama-local': {
    provider: 'ollama',
    model: 'llama3.2',
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    avgLatencyMs: 500,
  },
  'ollama-coder': {
    provider: 'ollama',
    model: 'ollama-coder',
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    avgLatencyMs: 480,
  },
  'nomic-embed-text': {
    provider: 'nomic',
    model: 'nomic-embed-text',
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    avgLatencyMs: 300,
  },
}

/**
 * Create default provider configuration from environment variables
 */
export function createDefaultConfig(): ProviderConfig {
  return ProviderConfigSchema.parse({
    baseURL: process.env.LITELLM_BASE_URL || 'http://litellm:4000',
    apiKey: process.env.LITELLM_API_KEY || 'dummy',
    defaultModel: process.env.DEFAULT_MODEL || 'gpt-4-turbo',
    fallbackModels: process.env.FALLBACK_MODELS?.split(',') || [
      'deepseek-r1',
      'gpt-4-turbo',
      'gemini-pro',
    ],
    telemetry: process.env.TELEMETRY_ENABLED !== 'false',
    trackCost: process.env.TRACK_COST !== 'false',
  })
}
