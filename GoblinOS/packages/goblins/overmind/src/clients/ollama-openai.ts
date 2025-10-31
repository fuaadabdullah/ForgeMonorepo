/**
 * Ollama OpenAI-Compatible Client
 *
 * Drop-in replacement using OpenAI SDK pointed at Ollama's /v1 endpoint.
 * Use this when you want local inference without changing app logic.
 *
 * Docs: https://docs.ollama.com/openai
 *
 * @module clients/ollama-openai
 */

import type {
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'
import { createOpenAIClient } from './openai-adapter.js'

/**
 * Ollama client using OpenAI-compatible API
 */
// Cast OpenAI to `any` for triage: current installed types show OpenAI as a
// namespace-like module without construct signatures. Use a local `any` cast
// to allow triage-time construction while we implement a small adapter.
export const ollamaOpenAI = createOpenAIClient({
  baseURL: process.env.OLLAMA_BASE_URL?.endsWith('/v1')
    ? process.env.OLLAMA_BASE_URL
    : `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1`,
  apiKey: 'ollama', // Required by OpenAI client, ignored by Ollama
})

/**
 * Chat completion with Ollama via OpenAI-compatible endpoint
 *
 * @example
 * ```typescript
 * const stream = await chatOllama([
 *   { role: "user", content: "What's the status, Overmind?" }
 * ], "llama3.1");
 *
 * for await (const chunk of stream) {
 *   const delta = chunk.choices[0]?.delta?.content;
 *   if (delta) process.stdout.write(delta);
 * }
 * ```
 */
export async function chatOllama(
  messages: ChatCompletionMessageParam[],
  model = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1',
  options: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  } = {}
) {
  const { temperature = 0.7, maxTokens = 4096, stream = true } = options

  // Cast to `any` here: we intentionally target the OpenAI-compatible
  // endpoint served by Ollama, but the local `openai` types differ. Casting
  // removes a strict type dependency during triage; we'll replace with a
  // narrow adapter later.
  return await (ollamaOpenAI as any).chat.completions.create({
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
export async function chatOllamaSync(
  messages: ChatCompletionMessageParam[],
  model = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1',
  options: {
    temperature?: number
    maxTokens?: number
  } = {}
) {
  const { temperature = 0.7, maxTokens = 4096 } = options

  return await (ollamaOpenAI as any).chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  })
}

/**
 * Check if Ollama is healthy and reachable
 */
export async function isOllamaHealthy(): Promise<boolean> {
  try {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const response = await fetch(`${baseURL}/api/tags`)
    return response.ok
  } catch (_error) {
    return false
  }
}

/**
 * List available Ollama models
 */
export async function listOllamaModels(): Promise<string[]> {
  try {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const response = await fetch(`${baseURL}/api/tags`)
    if (!response.ok) return []

    const data: any = await response.json()
    const models = Array.isArray(data.models) ? data.models : []
    return models
      .map((m: unknown) => (m as Record<string, unknown>).name as string | undefined)
      .filter(Boolean) as string[]
  } catch (error) {
    console.error('Failed to list Ollama models:', error)
    return []
  }
}

// Backward-compatible alias expected by some modules
export const chatOpenAI = chatOllama
