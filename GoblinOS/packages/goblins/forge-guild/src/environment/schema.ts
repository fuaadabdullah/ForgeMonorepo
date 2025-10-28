/**
 * Environment Schema Definitions
 *
 * Zod schemas for Smithy environment configuration.
 * All schemas use .default({}) for flexible partial configurations.
 *
 * @module @goblinos/forge-guild/env/schema
 */

import { z } from 'zod'

// Base schemas without defaults
const smithyEnvBase = z.object({
  // AI/ML Providers
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Ollama Configuration
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5-coder:7b'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),

  // Security
  ENABLE_SECURITY_SCAN: z.boolean().default(true),
  ENABLE_CONTENT_FILTER: z.boolean().default(true),
  BLOCKED_KEYWORDS: z.string().default('hack,exploit,malware'),

  // Performance
  MAX_CONCURRENT_TASKS: z.number().default(5),
  REQUEST_TIMEOUT_MS: z.number().default(30000),

  // IaC Configuration
  DEFAULT_IAC_PROVIDER: z.enum(['terraform', 'arm', 'cloudformation']).default('terraform'),
  DEFAULT_CLOUD_PROVIDER: z.enum(['aws', 'azure', 'gcp']).default('aws'),

  // Container Configuration
  DEFAULT_BASE_IMAGE: z.string().default('node:20'),
  ENABLE_DOCKER_IN_DOCKER: z.boolean().default(true),
})

const projectEnvBase = z.object({
  PROJECT_NAME: z.string().optional(),
  PROJECT_TYPE: z.enum(['node', 'python', 'go', 'rust']).optional(),
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
})

const agentEnvBase = z.object({
  AGENT_ID: z.string().optional(),
  AGENT_TIMEOUT_MS: z.number().default(60000),
  AGENT_MEMORY_LIMIT_MB: z.number().default(512),
})

// Schemas with defaults
export const smithyEnvSchema = smithyEnvBase.default({})
export const projectEnvSchema = projectEnvBase.default({})
export const agentEnvSchema = agentEnvBase.default({})

// Combined schema for validation
export const combinedEnvSchema = smithyEnvBase.merge(projectEnvBase).merge(agentEnvBase).default({})

// Export types
export type SmithyEnv = z.infer<typeof smithyEnvSchema>
export type ProjectEnv = z.infer<typeof projectEnvSchema>
export type AgentEnv = z.infer<typeof agentEnvSchema>
export type CombinedEnv = z.infer<typeof combinedEnvSchema>
