/**
 * Structured Outputs Module - JSON Schema Validation for LLM Responses
 *
 * Provides provider-agnostic structured output generation with JSON Schema validation.
 * Ensures LLM responses conform to expected data structures for reliable parsing.
 *
 * @module structured
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { litellm } from '../clients/litellm-proxy.js'
import { chatOllamaStructured } from '../clients/ollama-native.js'
import { chatOpenAI } from '../clients/ollama-openai.js'
import { LLMProvider } from '../types.js'

/**
 * JSON Schema definition for structured outputs
 */
export interface JSONSchema {
  type: 'object'
  properties: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  enum?: string[] | number[]
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

/**
 * Request for structured output generation
 */
export interface StructuredOutputRequest {
  messages: ChatCompletionMessageParam[]
  schema: JSONSchema
  model?: string
  temperature?: number
  max_tokens?: number
  provider?: LLMProvider
}

/**
 * Response from structured output generation
 */
export interface StructuredOutputResponse {
  content: string // JSON string conforming to schema
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: LLMProvider
  model: string
}

/**
 * Generate structured output using the best available provider
 *
 * Automatically selects provider based on schema complexity and availability:
 * - Ollama: Best for structured outputs (native JSON Schema support)
 * - OpenAI: Good structured output support with JSON mode
 * - Gemini: Strong JSON generation capabilities
 * - DeepSeek: Good for simpler schemas
 *
 * @param request - Structured output request
 * @returns Promise resolving to structured response
 */
export async function generateStructuredOutput(
  request: StructuredOutputRequest
): Promise<StructuredOutputResponse> {
  const { provider = LLMProvider.OLLAMA } = request

  // Use specified provider or auto-select based on schema complexity
  const selectedProvider = provider || selectProviderForSchema(request.schema)

  switch (selectedProvider) {
    case LLMProvider.OLLAMA:
      return await generateWithOllama(request)

    case LLMProvider.OPENAI:
      return await generateWithOpenAI(request)

    case LLMProvider.GEMINI:
      return await generateWithGemini(request)

    case LLMProvider.DEEPSEEK:
      return await generateWithDeepSeek(request)

    case LLMProvider.LITELLM:
      return await generateWithLiteLLM(request)

    default:
      throw new Error(`Structured outputs not supported for provider: ${selectedProvider}`)
  }
}

/**
 * Auto-select provider based on schema complexity and capabilities
 */
function selectProviderForSchema(schema: JSONSchema): LLMProvider {
  // Count nested objects and arrays (complexity indicator)
  const complexity = countSchemaComplexity(schema)

  // Simple schemas: prefer Ollama (fast, local, good JSON support)
  if (complexity < 3) {
    return LLMProvider.OLLAMA
  }

  // Complex schemas: prefer Gemini (excellent structured output)
  if (complexity >= 5) {
    return LLMProvider.GEMINI
  }

  // Medium complexity: Ollama still good, but Gemini as backup
  return LLMProvider.OLLAMA
}

/**
 * Count schema complexity (nested objects, arrays, enums)
 */
function countSchemaComplexity(schema: JSONSchema): number {
  let complexity = 0

  function traverse(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return

    if (obj.type === 'object' && obj.properties) {
      complexity++
      Object.values(obj.properties).forEach(traverse)
    }

    if (obj.type === 'array' && obj.items) {
      complexity++
      traverse(obj.items)
    }

    if (obj.enum) {
      complexity += 0.5 // Enums add some complexity
    }

    if (obj.required) {
      complexity += 0.2 // Required fields add validation complexity
    }
  }

  traverse(schema)
  return complexity
}

/**
 * Generate structured output using Ollama (recommended for structured outputs)
 */
async function generateWithOllama(
  request: StructuredOutputRequest
): Promise<StructuredOutputResponse> {
  const { messages, schema, model = 'llama3.1', temperature = 0.1 } = request

  // Convert OpenAI message format to Ollama format
  const ollamaMessages = messages.map((msg) => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }))

  const response = await chatOllamaStructured({
    model,
    messages: ollamaMessages,
    schema,
    temperature,
  })

  return {
    content: response.message.content,
    usage: response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens || 0,
          completion_tokens: response.usage.eval_count || 0,
          total_tokens: (response.usage.prompt_tokens || 0) + (response.usage.eval_count || 0),
        }
      : undefined,
    provider: LLMProvider.OLLAMA,
    model,
  }
}

/**
 * Generate structured output using OpenAI
 */
async function generateWithOpenAI(
  request: StructuredOutputRequest
): Promise<StructuredOutputResponse> {
  const { messages, schema, model = 'gpt-4o-mini', temperature = 0.1 } = request

  // OpenAI supports JSON mode, but not full JSON Schema validation
  // We'll use a prompt-based approach with schema description
  const systemMessage: ChatCompletionMessageParam = {
    role: 'system',
    content: `You must respond with valid JSON that conforms to this schema:\n${JSON.stringify(
      schema,
      null,
      2
    )}\n\nDo not include any other text or explanation. Only return the JSON object.`,
  }

  const response = await chatOpenAI({
    messages: [systemMessage, ...messages],
    model,
    temperature,
    response_format: { type: 'json_object' },
  })

  return {
    content: response.choices[0].message.content || '{}',
    usage: response.usage,
    provider: LLMProvider.OPENAI,
    model,
  }
}

/**
 * Generate structured output using Gemini
 */
async function generateWithGemini(
  request: StructuredOutputRequest
): Promise<StructuredOutputResponse> {
  const { messages, schema, model = 'gemini-2.0-flash-exp', temperature = 0.1 } = request

  // Gemini has good JSON generation capabilities
  const systemMessage: ChatCompletionMessageParam = {
    role: 'system',
    content: `Generate a JSON response that strictly conforms to this schema:\n${JSON.stringify(
      schema,
      null,
      2
    )}\n\nReturn only the JSON object, no additional text.`,
  }

  const response = await litellm.chat.completions.create({
    model: `gemini/${model}`,
    messages: [systemMessage, ...messages],
    temperature,
    extra_body: {
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    },
  })

  const choice = response.choices[0]
  return {
    content: choice.message.content || '{}',
    usage: response.usage,
    provider: LLMProvider.GEMINI,
    model,
  }
}

/**
 * Generate structured output using DeepSeek
 */
async function generateWithDeepSeek(
  request: StructuredOutputRequest
): Promise<StructuredOutputResponse> {
  const { messages, schema, model = 'deepseek-chat', temperature = 0.1 } = request

  const systemMessage: ChatCompletionMessageParam = {
    role: 'system',
    content: `Respond with valid JSON conforming to this schema:\n${JSON.stringify(
      schema,
      null,
      2
    )}\n\nReturn only the JSON object.`,
  }

  const response = await litellm.chat.completions.create({
    model: `deepseek/${model}`,
    messages: [systemMessage, ...messages],
    temperature,
    response_format: { type: 'json_object' },
  })

  const choice = response.choices[0]
  return {
    content: choice.message.content || '{}',
    usage: response.usage,
    provider: LLMProvider.DEEPSEEK,
    model,
  }
}

/**
 * Generate structured output using LiteLLM proxy
 */
async function generateWithLiteLLM(
  request: StructuredOutputRequest
): Promise<StructuredOutputResponse> {
  const { messages, schema, model = 'deepseek/deepseek-chat', temperature = 0.1 } = request

  const systemMessage: ChatCompletionMessageParam = {
    role: 'system',
    content: `Generate JSON that conforms to this schema:\n${JSON.stringify(
      schema,
      null,
      2
    )}\n\nReturn only the JSON object.`,
  }

  const response = await litellm.chat.completions.create({
    model,
    messages: [systemMessage, ...messages],
    temperature,
    response_format: { type: 'json_object' },
  })

  const choice = response.choices[0]
  return {
    content: choice.message.content || '{}',
    usage: response.usage,
    provider: LLMProvider.LITELLM,
    model,
  }
}

/**
 * Validate that generated content conforms to schema
 */
export function validateStructuredOutput(content: string, schema: JSONSchema): boolean {
  try {
    const parsed = JSON.parse(content)

    // Basic type check
    if (typeof parsed !== 'object' || parsed === null) {
      return false
    }

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in parsed)) {
          return false
        }
      }
    }

    // Basic property type validation
    for (const [key, value] of Object.entries(parsed)) {
      const propSchema = schema.properties[key]
      if (!propSchema) {
        if (schema.additionalProperties === false) {
          return false
        }
        continue
      }

      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== propSchema.type) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}
