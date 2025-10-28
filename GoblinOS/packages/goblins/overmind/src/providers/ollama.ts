/**
 * 🦙 Ollama Local LLM Provider
 *
 * Integrates Ollama for local, privacy-preserving LLM inference.
 * Supports cost-free local models with embedding capabilities for RAG.
 *
 * @module @goblinos/overmind/providers/ollama
 */

import { config } from 'dotenv'
import { Ollama } from 'ollama'
import { trace, tracingUtils } from '../../observability/tracing.js'
import { LLMProvider } from '../types.js'

// Load environment variables
config()

/**
 * Ollama provider configuration
 */
export interface OllamaProviderConfig {
  baseURL: string
  defaultModel: string
  models: string[]
  costThreshold: number // USD per month for volume-based routing
}

/**
 * Default Ollama configuration
 */
export const DEFAULT_OLLAMA_CONFIG: OllamaProviderConfig = {
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:3b',
  models: ['qwen2.5:3b', 'qwen2.5-coder:3b'],
  costThreshold: Number.parseFloat(process.env.OLLAMA_COST_THRESHOLD || '100'), // $100/month threshold
}

/**
 * Ollama client instance
 */
const ollamaClient = new Ollama({
  host: DEFAULT_OLLAMA_CONFIG.baseURL,
})

/**
 * Tracer for Ollama operations
 */
const tracer = trace.getTracer('overmind-ollama')

/**
 * Generate text using Ollama model
 */
export async function generateWithOllama(
  model: string,
  prompt: string,
  options: {
    context?: string[]
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<string> {
  return tracer.startActiveSpan('ollama.generate', async (span: any) => {
    try {
      span.setAttribute('llm.provider', LLMProvider.OLLAMA)
      span.setAttribute('llm.model', model)
      span.setAttribute('message.length', prompt.length)

      const fullPrompt = options.context ? `${options.context.join('\n')}\n${prompt}` : prompt

      const startTime = Date.now()

      const response = await ollamaClient.generate({
        model,
        prompt: fullPrompt,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 500,
        },
        stream: false,
      })

      const latency = Date.now() - startTime
      span.setAttribute('llm.latency', latency)
      span.setAttribute('llm.tokens', response.eval_count || 0)

      return response.response
    } catch (error) {
      span.recordException(error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Ollama generation failed: ${message}`)
    } finally {
      span.end()
    }
  })
}

/**
 * Generate embeddings using Ollama
 */
export async function embedWithOllama(text: string, model = 'qwen2.5:3b'): Promise<number[]> {
  return tracer.startActiveSpan('ollama.embed', async (span: any) => {
    try {
      span.setAttribute('llm.provider', LLMProvider.OLLAMA)
      span.setAttribute('llm.model', model)
      span.setAttribute('embedding.text_length', text.length)

      const startTime = Date.now()

      const response = await ollamaClient.embeddings({
        model,
        prompt: text,
      })

      const latency = Date.now() - startTime
      span.setAttribute('llm.latency', latency)

      return response.embedding
    } catch (error) {
      span.recordException(error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Ollama embedding failed: ${message}`)
    } finally {
      span.end()
    }
  })
}

/**
 * List available Ollama models
 */
export async function listOllamaModels(): Promise<string[]> {
  return tracer.startActiveSpan('ollama.listModels', async (span: any) => {
    try {
      const response = await ollamaClient.list()
      const models = response.models.map((m: any) => m.name)
      span.setAttribute('ollama.models_count', models.length)
      return models
    } catch (error) {
      span.recordException(error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to list Ollama models: ${message}`)
    } finally {
      span.end()
    }
  })
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth(
  autoPull = false
): Promise<{ available: boolean; models: string[]; pulledModels: string[] }> {
  return tracer.startActiveSpan('ollama.healthCheck', async (span: any) => {
    try {
      const models = await listOllamaModels()
      span.setAttribute('ollama.models_count', models.length)

      const pulledModels: string[] = []

      if (autoPull) {
        // Ensure default models are available
        for (const model of DEFAULT_OLLAMA_CONFIG.models) {
          if (!models.includes(model)) {
            try {
              await pullOllamaModel(model)
              pulledModels.push(model)
            } catch (error) {
              span.recordException(error)
              // Continue with other models
            }
          }
        }
      }

      const healthResult = {
        available: true,
        models,
        pulledModels,
      }

      // Add health check attributes using tracing utilities
      tracingUtils.addHealthCheckAttributes(span, healthResult)

      return healthResult
    } catch (error) {
      span.recordException(error)
      const healthResult = {
        available: false,
        models: [],
        pulledModels: [],
      }

      // Add health check attributes even for failures
      tracingUtils.addHealthCheckAttributes(span, healthResult)

      return healthResult
    } finally {
      span.end()
    }
  })
}

/**
 * Pull a model from Ollama registry
 */
export async function pullOllamaModel(model: string): Promise<void> {
  return tracer.startActiveSpan('ollama.pullModel', async (span: any) => {
    try {
      span.setAttribute('ollama.model', model)
      await ollamaClient.pull({ model })
    } catch (error) {
      span.recordException(error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to pull Ollama model ${model}: ${message}`)
    } finally {
      span.end()
    }
  })
}

/**
 * Select the best Ollama model for a task type
 */
export function selectModel(taskType: 'chat' | 'code' | 'embedding'): string {
  // Model selection based on task type
  switch (taskType) {
    case 'chat':
      // Use the general purpose qwen2.5:3b model for chat
      return 'qwen2.5:3b'
    case 'code':
      // Code tasks benefit from specialized models
      return 'qwen2.5-coder:3b'
    case 'embedding':
      // Use qwen2.5:3b for embeddings (Ollama supports embeddings with text models)
      return 'qwen2.5:3b'
    default:
      return DEFAULT_OLLAMA_CONFIG.defaultModel
  }
}

/**
 * Estimate savings by using Ollama vs cloud providers
 */
export function estimateSavings(
  cloudModel: string,
  inputTokens: number,
  outputTokens: number,
  monthlyVolume: number
): { savings: number; percentage: number; cloudCost: number; ollamaCost: number } {
  return tracer.startActiveSpan('ollama.estimateSavings', (span: any) => {
    try {
      span.setAttribute('savings.cloud_model', cloudModel)
      span.setAttribute('savings.input_tokens', inputTokens)
      span.setAttribute('savings.output_tokens', outputTokens)
      span.setAttribute('savings.monthly_volume', monthlyVolume)

      // Cloud provider costs (per 1M tokens)
      const cloudCosts: Record<string, { input: number; output: number }> = {
        'gpt-4o': { input: 2.5, output: 10.0 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 },
        'deepseek-chat': { input: 0.14, output: 0.28 },
        'gemini-2.0-flash': { input: 0.075, output: 0.3 },
      }

      const costs = cloudCosts[cloudModel]
      if (!costs) {
        const result = { savings: 0, percentage: 0, cloudCost: 0, ollamaCost: 0 }
        tracingUtils.addSavingsAttributes(span, result)
        return result
      }

      // Calculate monthly cloud cost
      const cloudCost =
        ((costs.input * inputTokens + costs.output * outputTokens) * monthlyVolume) / 1_000_000

      // Ollama cost is always 0
      const ollamaCost = 0

      const savings = cloudCost - ollamaCost
      const percentage = cloudCost > 0 ? (savings / cloudCost) * 100 : 0

      const result = { savings, percentage, cloudCost, ollamaCost }

      // Add savings attributes using tracing utilities
      tracingUtils.addSavingsAttributes(span, result)

      return result
    } finally {
      span.end()
    }
  })
}

/**
 * Generate text using Ollama model with streaming
 */
export async function generateWithOllamaStream(
  model: string,
  prompt: string,
  options: {
    context?: string[]
    temperature?: number
    maxTokens?: number
    onChunk?: (chunk: string) => void
  } = {}
): Promise<string> {
  return tracer.startActiveSpan('ollama.generateStream', async (span: any) => {
    try {
      span.setAttribute('llm.provider', LLMProvider.OLLAMA)
      span.setAttribute('llm.model', model)
      span.setAttribute('message.length', prompt.length)

      const fullPrompt = options.context ? `${options.context.join('\n')}\n${prompt}` : prompt

      const startTime = Date.now()
      let fullResponse = ''

      const response = await ollamaClient.generate({
        model,
        prompt: fullPrompt,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 500,
        },
        stream: true,
      })

      for await (const chunk of response) {
        const chunkText = chunk.response || ''
        fullResponse += chunkText

        if (options.onChunk) {
          options.onChunk(chunkText)
        }
      }

      const latency = Date.now() - startTime
      span.setAttribute('llm.latency', latency)
      span.setAttribute('llm.tokens', fullResponse.length / 4) // rough estimate

      return fullResponse
    } catch (error) {
      span.recordException(error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Ollama streaming generation failed: ${message}`)
    } finally {
      span.end()
    }
  })
}

/**
 * Pull model if needed and available
 */
export async function pullModelIfNeeded(model: string): Promise<boolean> {
  return tracer.startActiveSpan('ollama.pullIfNeeded', async (span: any) => {
    try {
      span.setAttribute('ollama.model', model)

      // Check if model is available
      const models = await listOllamaModels()
      if (models.includes(model)) {
        span.setAttribute('ollama.model_available', true)
        return true
      }

      span.setAttribute('ollama.model_available', false)

      // Try to pull the model
      try {
        await pullOllamaModel(model)
        span.setAttribute('ollama.model_pulled', true)
        return true
      } catch (pullError) {
        span.recordException(pullError)
        span.setAttribute('ollama.model_pulled', false)
        return false
      }
    } catch (error) {
      span.recordException(error)
      return false
    } finally {
      span.end()
    }
  })
}
