/**
 * 🔧 Overmind Configuration Loader
 *
 * Loads and validates configuration from environment variables
 * following ForgeMonorepo credential management standards.
 *
 * @see ../../../Obsidian/API_KEYS_MANAGEMENT.md
 * @module @goblinos/overmind/config
 */

import { config as loadEnv } from 'dotenv'
import { type OvermindConfig, OvermindConfigSchema, RoutingStrategy } from './types.js'

/**
 * Load Overmind configuration from environment variables
 */
export function loadConfig(): OvermindConfig {
  // Load .env file (see ../../../Obsidian/API_KEYS_MANAGEMENT.md)
  loadEnv()

  const rawConfig: OvermindConfig = {
    providers: {
      openai: process.env.OPENAI_API_KEY
        ? {
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
          }
        : undefined,
      deepseek: process.env.DEEPSEEK_API_KEY
        ? {
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
          }
        : undefined,
      gemini: process.env.GEMINI_API_KEY
        ? {
            apiKey: process.env.GEMINI_API_KEY,
          }
        : undefined,
      ollama: {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1',
      },
      litellm: {
        baseURL: process.env.LITELLM_URL || 'http://localhost:4000',
        apiKey: process.env.LITELLM_API_KEY || 'proxy',
      },
    },

    routing: {
      strategy:
        (process.env.OVERMIND_ROUTING_STRATEGY as RoutingStrategy) ||
        RoutingStrategy.COST_OPTIMIZED,
      preferLocal: process.env.OVERMIND_PREFER_LOCAL === 'true',
      offlineMode: process.env.OVERMIND_OFFLINE_MODE === 'true',
      costThresholds: {
        low: Number(process.env.OVERMIND_COST_THRESHOLD_LOW) || 0.1,
        medium: Number(process.env.OVERMIND_COST_THRESHOLD_MEDIUM) || 1.0,
        high: Number(process.env.OVERMIND_COST_THRESHOLD_HIGH) || 10.0,
      },
      latencyThresholds: {
        fast: Number(process.env.OVERMIND_LATENCY_THRESHOLD_FAST) || 500,
        medium: Number(process.env.OVERMIND_LATENCY_THRESHOLD_MEDIUM) || 2000,
        slow: Number(process.env.OVERMIND_LATENCY_THRESHOLD_SLOW) || 5000,
      },
      enableFailover: process.env.OVERMIND_ENABLE_FAILOVER !== 'false',
    },

    memory: {
      enabled: process.env.OVERMIND_ENABLE_MEMORY !== 'false',
      backend: (process.env.OVERMIND_MEMORY_BACKEND as 'sqlite' | 'postgres' | 'redis') || 'sqlite',
      dbPath: process.env.OVERMIND_MEMORY_DB_PATH || './data/overmind-memory.db',
      vectorDB: process.env.OVERMIND_VECTOR_DB as 'chroma' | 'pinecone' | 'weaviate' | undefined,
      vectorDBPath: process.env.OVERMIND_VECTOR_DB_PATH,
    },

    crew: {
      maxSize: Number(process.env.OVERMIND_MAX_CREW_SIZE) || 10,
      agentTimeout: Number(process.env.OVERMIND_AGENT_TIMEOUT) || 300000,
    },

    observability: {
      logLevel:
        (process.env.OVERMIND_LOG_LEVEL as 'trace' | 'debug' | 'info' | 'warn' | 'error') || 'info',
      logPretty: process.env.OVERMIND_LOG_PRETTY === 'true',
      metricsEnabled: process.env.OVERMIND_ENABLE_METRICS !== 'false',
      otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    },

    api: {
      host: process.env.OVERMIND_API_HOST || '127.0.0.1',
      port: Number(process.env.OVERMIND_API_PORT) || 8001,
      apiKey: process.env.OVERMIND_API_KEY,
      enableWebSocket: process.env.OVERMIND_ENABLE_WEBSOCKET !== 'false',
    },
  }

  // Validate configuration
  const validated = OvermindConfigSchema.parse(rawConfig)

  // Verify at least one provider is configured
  const hasProvider = !!(
    validated.providers.openai ||
    validated.providers.deepseek ||
    validated.providers.gemini ||
    validated.providers.ollama ||
    validated.providers.litellm
  )

  if (!hasProvider) {
    throw new Error(
      'At least one LLM provider must be configured. See ../../../Obsidian/API_KEYS_QUICKREF.md'
    )
  }

  return validated
}

/**
 * Get available LLM providers
 */
export function getAvailableProviders(config: OvermindConfig): string[] {
  const providers: string[] = []
  if (config.providers.openai) providers.push('openai')
  if (config.providers.deepseek) providers.push('deepseek')
  if (config.providers.gemini) providers.push('gemini')
  if (config.providers.ollama) providers.push('ollama')
  if (config.providers.litellm) providers.push('litellm')
  return providers
}

/**
 * Validate API keys are present (without exposing values)
 */
export function validateApiKeys(config: OvermindConfig): {
  valid: boolean
  missing: string[]
} {
  const missing: string[] = []

  // Check configured providers have keys
  if (config.providers.openai && !config.providers.openai.apiKey) {
    missing.push('OPENAI_API_KEY')
  }
  if (config.providers.deepseek && !config.providers.deepseek.apiKey) {
    missing.push('DEEPSEEK_API_KEY')
  }
  if (config.providers.gemini && !config.providers.gemini.apiKey) {
    missing.push('GEMINI_API_KEY')
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
