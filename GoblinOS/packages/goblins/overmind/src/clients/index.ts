/**
 * 🤖 LLM Client Factory
 *
 * Unified interface for OpenAI, DeepSeek, and Google Gemini LLMs.
 * Implements OpenAI-compatible API for DeepSeek and adapter for Gemini.
 *
 * @module @goblinos/overmind/clients
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import type { LLMProvider, Message, Metrics, OvermindConfig } from '../types.js'
import { LLMProvider as Provider } from '../types.js'

export interface LLMResponse {
  content: string
  provider: LLMProvider
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latency: number
}

/**
 * Abstract base class for LLM clients
 */
export abstract class LLMClient {
  abstract generate(
    messages: Message[],
    model: string,
    options?: {
      maxTokens?: number
      temperature?: number
      topP?: number
    }
  ): Promise<LLMResponse>

  abstract getProvider(): LLMProvider
}

/**
 * OpenAI client
 */
export class OpenAIClient extends LLMClient {
  private client: OpenAI

  constructor(apiKey: string, baseURL?: string) {
    super()
    this.client = new OpenAI({ apiKey, baseURL })
  }

  async generate(
    messages: Message[],
    model: string,
    options?: { maxTokens?: number; temperature?: number; topP?: number }
  ): Promise<LLMResponse> {
    const startTime = Date.now()

    const response = await this.client.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      max_tokens: options?.maxTokens,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
    })

    const latency = Date.now() - startTime
    const choice = response.choices[0]
    const usage = response.usage!

    return {
      content: choice.message.content || '',
      provider: Provider.OPENAI,
      model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      latency,
    }
  }

  getProvider(): LLMProvider {
    return Provider.OPENAI
  }
}

/**
 * DeepSeek client (OpenAI-compatible)
 */
export class DeepSeekClient extends LLMClient {
  private client: OpenAI

  constructor(apiKey: string, baseURL: string) {
    super()
    this.client = new OpenAI({
      apiKey,
      baseURL, // https://api.deepseek.com
    })
  }

  async generate(
    messages: Message[],
    model: string,
    options?: { maxTokens?: number; temperature?: number; topP?: number }
  ): Promise<LLMResponse> {
    const startTime = Date.now()

    const response = await this.client.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      max_tokens: options?.maxTokens,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
    })

    const latency = Date.now() - startTime
    const choice = response.choices[0]
    const usage = response.usage!

    return {
      content: choice.message.content || '',
      provider: Provider.DEEPSEEK,
      model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      latency,
    }
  }

  getProvider(): LLMProvider {
    return Provider.DEEPSEEK
  }
}

/**
 * Google Gemini client
 */
export class GeminiClient extends LLMClient {
  private client: GoogleGenerativeAI

  constructor(apiKey: string) {
    super()
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async generate(
    messages: Message[],
    model: string,
    options?: { maxTokens?: number; temperature?: number; topP?: number }
  ): Promise<LLMResponse> {
    const startTime = Date.now()

    const genModel = this.client.getGenerativeModel({ model })

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    // Gemini client expects a provider-specific history shape. We keep a
    // conservative, untyped shape here and narrow to a Record<string, unknown>[]
    // to avoid `any` while preserving runtime behavior.
    const historyShape: Record<string, unknown>[] = history as unknown as Record<string, unknown>[]

    const chat = genModel.startChat({
      history: historyShape,
      generationConfig: {
        maxOutputTokens: options?.maxTokens,
        temperature: options?.temperature ?? 0.7,
        topP: options?.topP,
      },
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response

    const latency = Date.now() - startTime

    // Gemini doesn't always provide token counts. Narrow `response` to an
    // indexable record to avoid `any` and safely read optional metadata.
    const responseRecord = response as unknown as Record<string, unknown>
    const usageMetadata =
      (responseRecord.usageMetadata as Record<string, unknown> | undefined) ?? {}
    const promptTokens = Number((usageMetadata.promptTokenCount ?? 0) as number) || 0
    const completionTokens = Number((usageMetadata.candidatesTokenCount ?? 0) as number) || 0

    return {
      content: response.text(),
      provider: Provider.GEMINI,
      model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      latency,
    }
  }

  getProvider(): LLMProvider {
    return Provider.GEMINI
  }
}

/**
 * Client factory: creates appropriate client based on provider
 */
export class LLMClientFactory {
  private config: OvermindConfig
  private clients: Map<LLMProvider, LLMClient>

  constructor(config: OvermindConfig) {
    this.config = config
    this.clients = new Map()
    this.initializeClients()
  }

  private initializeClients(): void {
    // Initialize OpenAI
    if (this.config.providers.openai) {
      this.clients.set(
        Provider.OPENAI,
        new OpenAIClient(this.config.providers.openai.apiKey, this.config.providers.openai.baseURL)
      )
    }

    // Initialize DeepSeek
    if (this.config.providers.deepseek) {
      this.clients.set(
        Provider.DEEPSEEK,
        new DeepSeekClient(
          this.config.providers.deepseek.apiKey,
          this.config.providers.deepseek.baseURL
        )
      )
    }

    // Initialize Gemini
    if (this.config.providers.gemini) {
      this.clients.set(Provider.GEMINI, new GeminiClient(this.config.providers.gemini.apiKey))
    }
  }

  getClient(provider: LLMProvider): LLMClient {
    const client = this.clients.get(provider)
    if (!client) {
      throw new Error(`No client configured for provider: ${provider}`)
    }
    return client
  }

  hasProvider(provider: LLMProvider): boolean {
    return this.clients.has(provider)
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.clients.keys())
  }
}

/**
 * Execute LLM call with automatic retry and failover
 */
export async function executeWithRetry(
  client: LLMClient,
  messages: Message[],
  model: string,
  options: {
    maxRetries?: number
    timeout?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<LLMResponse> {
  const maxRetries = options.maxRetries ?? 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await Promise.race([
        client.generate(messages, model),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), options.timeout || 30000)
        ),
      ])

      return response
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        options.onRetry?.(attempt, lastError)
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`)
}
