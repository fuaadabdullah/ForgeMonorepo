/**
 * Ollama Native Client
 *
 * Uses Ollama's native JavaScript client for advanced features:
 * - Structured outputs (JSON Schema validation)
 * - Tool/function calling (with streaming)
 * - Embeddings generation
 *
 * Use this when you need features beyond OpenAI compatibility.
 *
 * Docs: https://github.com/ollama/ollama-js
 *
 * @module clients/ollama-native
 */

import ollama from 'ollama'
import type { ChatRequest, ChatResponse, EmbeddingsResponse, Message } from 'ollama'

export interface StructuredOutputRequest {
  model?: string
  messages: Message[]
  schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  temperature?: number
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface ToolCallRequest {
  model?: string
  messages: Message[]
  tools: ToolDefinition[]
  stream?: boolean
}

/**
 * Chat with structured JSON output (JSON Schema validation)
 *
 * @example
 * ```typescript
 * const recipe = await chatOllamaStructured({
 *   messages: [{ role: "user", content: "Give me a smoothie recipe" }],
 *   schema: {
 *     type: "object",
 *     properties: {
 *       title: { type: "string" },
 *       ingredients: { type: "array", items: { type: "string" } },
 *       steps: { type: "array", items: { type: "string" } }
 *     },
 *     required: ["title", "ingredients", "steps"]
 *   }
 * });
 *
 * console.log(JSON.parse(recipe.message.content));
 * ```
 */
export async function chatOllamaStructured(
  request: StructuredOutputRequest
): Promise<ChatResponse> {
  const { model = 'llama3.1', messages, schema, temperature = 0.7 } = request

  return await ollama.chat({
    model,
    messages,
    format: schema, // JSON Schema enforcement
    options: {
      temperature,
    },
  })
}

/**
 * Chat with tool/function calling support (streaming available)
 *
 * @example
 * ```typescript
 * const response = await chatOllamaTools({
 *   messages: [{ role: "user", content: "What's the weather in Toronto?" }],
 *   tools: [{
 *     type: "function",
 *     function: {
 *       name: "get_weather",
 *       description: "Get current weather for a location",
 *       parameters: {
 *         type: "object",
 *         properties: {
 *           location: { type: "string" },
 *           unit: { type: "string", enum: ["celsius", "fahrenheit"] }
 *         },
 *         required: ["location"]
 *       }
 *     }
 *   }],
 *   stream: true
 * });
 *
 * for await (const part of response) {
 *   if (part.message.tool_calls) {
 *     console.log("Tool call:", part.message.tool_calls);
 *   }
 * }
 * ```
 */
export async function chatOllamaTools(
  request: ToolCallRequest
): Promise<ChatResponse | AsyncGenerator<ChatResponse>> {
  const {
    model = 'qwen2.5-coder:7b', // Qwen has strong tool-calling
    messages,
    tools,
    stream = false,
  } = request

  const response = await ollama.chat({
    model,
    messages,
    tools,
    stream,
  })

  // Ollama client returns streaming or non-streaming chat shapes. Narrow to
  // an unknown and cast to the declared union return type to avoid `any`.
  return response as unknown as ChatResponse | AsyncGenerator<ChatResponse>
}

/**
 * Generate embeddings for RAG (local, no API costs)
 *
 * @example
 * ```typescript
 * const embedding = await embedOllama("ForgeTM design charter");
 * // Store embedding in vector DB (Chroma, Pinecone, etc.)
 * ```
 */
export async function embedOllama(text: string, model = 'nomic-embed-text'): Promise<number[]> {
  const response: EmbeddingsResponse = await ollama.embeddings({
    model,
    prompt: text,
  })

  return response.embedding
}

/**
 * Batch embed multiple texts efficiently
 */
export async function embedOllamaBatch(
  texts: string[],
  model = 'nomic-embed-text'
): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map((text) => embedOllama(text, model)))
  return embeddings
}

/**
 * Pull a model from Ollama library (download if not present)
 *
 * @example
 * ```typescript
 * await pullModel("llama3.1", (progress) => {
 *   console.log(`Downloading: ${progress.completed}/${progress.total}`);
 * });
 * ```
 */
export async function pullModel(
  model: string,
  onProgress?: (progress: { status: string; completed?: number; total?: number }) => void
): Promise<void> {
  const stream = await ollama.pull({ model, stream: true })

  for await (const part of stream) {
    if (onProgress) {
      onProgress({
        status: part.status,
        completed: part.completed,
        total: part.total,
      })
    }
  }
}

/**
 * List all locally installed Ollama models
 */
export async function listModels(): Promise<
  Array<{ name: string; size: number; modified_at: string }>
> {
  const response = await ollama.list()
  return response.models.map((model) => ({
    name: model.name,
    size: model.size,
    modified_at: model.modified_at,
  }))
}

/**
 * Show detailed information about a model
 */
export async function showModel(model: string): Promise<Record<string, unknown>> {
  const res = await ollama.show({ model })
  return res as unknown as Record<string, unknown>
}

/**
 * Delete a model from local storage
 */
export async function deleteModel(model: string): Promise<void> {
  await ollama.delete({ model })
}

/**
 * Check Ollama service health
 */
export async function checkHealth(): Promise<{ healthy: boolean; models: number }> {
  try {
    const models = await listModels()
    return { healthy: true, models: models.length }
  } catch (_error) {
    return { healthy: false, models: 0 }
  }
}
