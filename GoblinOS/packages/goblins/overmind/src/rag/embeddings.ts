/**
 * RAG Embeddings Module
 *
 * Provides embedding generation utilities for local RAG pipeline:
 * - Single text embedding
 * - Batch embedding with parallel processing
 * - Embedding caching to reduce compute
 * - Multiple provider support (Ollama, OpenAI)
 *
 * @module rag/embeddings
 */

import { embedLiteLLM } from '../clients/litellm-proxy.js'
import { embedOllama, embedOllamaBatch } from '../clients/ollama-native.js'

/**
 * Embedding vector (array of floats)
 */
export type EmbeddingVector = number[]

/**
 * Embedding result with metadata
 */
export interface EmbeddingResult {
  text: string
  vector: EmbeddingVector
  model: string
  dimensions: number
  timestamp: number
}

/**
 * Embedding provider options
 */
export type EmbeddingProvider = 'ollama' | 'openai' | 'auto'

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  provider: EmbeddingProvider
  model?: string
  batchSize?: number
  cache?: boolean
}

/**
 * Simple in-memory cache for embeddings
 * Key: `${provider}:${model}:${text}` -> vector
 */
const embeddingCache = new Map<string, EmbeddingVector>()

/**
 * Generate cache key
 */
function getCacheKey(provider: string, model: string, text: string): string {
  return `${provider}:${model}:${text}`
}

/**
 * Generate embedding for a single text
 *
 * @param text - Text to embed
 * @param config - Embedding configuration
 * @returns Embedding result with vector and metadata
 */
export async function embed(
  text: string,
  config: EmbeddingConfig = { provider: 'auto' }
): Promise<EmbeddingResult> {
  const provider = config.provider === 'auto' ? 'ollama' : config.provider
  const model =
    config.model || (provider === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small')

  // Check cache if enabled
  if (config.cache) {
    const cacheKey = getCacheKey(provider, model, text)
    const cached = embeddingCache.get(cacheKey)
    if (cached) {
      return {
        text,
        vector: cached,
        model,
        dimensions: cached.length,
        timestamp: Date.now(),
      }
    }
  }

  // Generate embedding
  let vector: EmbeddingVector

  if (provider === 'ollama') {
    // embedOllama may return either a single vector or a batch; cast to
    // EmbeddingVector for the triage pass and normalize later with a
    // proper typed adapter.
    vector = (await embedOllama(text, model)) as any as EmbeddingVector
  } else {
    // OpenAI via LiteLLM
    const result = await embedLiteLLM(text, { taskType: 'rag' })
    vector = Array.isArray(result) ? result : result.data[0].embedding
  }

  // Cache if enabled
  if (config.cache) {
    const cacheKey = getCacheKey(provider, model, text)
    embeddingCache.set(cacheKey, vector)
  }

  return {
    text,
    vector,
    model,
    dimensions: vector.length,
    timestamp: Date.now(),
  }
}

/**
 * Generate embeddings for multiple texts in parallel batches
 *
 * @param texts - Array of texts to embed
 * @param config - Embedding configuration
 * @returns Array of embedding results
 */
export async function embedBatch(
  texts: string[],
  config: EmbeddingConfig = { provider: 'auto', batchSize: 10 }
): Promise<EmbeddingResult[]> {
  const provider = config.provider === 'auto' ? 'ollama' : config.provider
  const model =
    config.model || (provider === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small')
  const batchSize = config.batchSize || 10

  const results: EmbeddingResult[] = []

  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    // Check cache for each text
    const uncached: string[] = []
    const uncachedIndices: number[] = []

    for (let j = 0; j < batch.length; j++) {
      const text = batch[j]
      const cacheKey = getCacheKey(provider, model, text)
      const cached = config.cache ? embeddingCache.get(cacheKey) : undefined

      if (cached) {
        results.push({
          text,
          vector: cached,
          model,
          dimensions: cached.length,
          timestamp: Date.now(),
        })
      } else {
        uncached.push(text)
        uncachedIndices.push(i + j)
      }
    }

    // Generate embeddings for uncached texts
    if (uncached.length > 0) {
      let vectors: EmbeddingVector[]

      if (provider === 'ollama') {
        vectors = await embedOllamaBatch(uncached, model)
      } else {
        // OpenAI via LiteLLM (batch support)
        const batchResults = await Promise.all(
          uncached.map((text) => embedLiteLLM(text, { taskType: 'rag' }))
        )
        vectors = batchResults.map((r) => (Array.isArray(r) ? r : r.data[0].embedding))
      }

      // Add to results and cache
      for (let j = 0; j < uncached.length; j++) {
        const text = uncached[j]
        const vector = vectors[j]

        results.push({
          text,
          vector,
          model,
          dimensions: vector.length,
          timestamp: Date.now(),
        })

        if (config.cache) {
          const cacheKey = getCacheKey(provider, model, text)
          embeddingCache.set(cacheKey, vector)
        }
      }
    }
  }

  return results
}

/**
 * Compute cosine similarity between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score (0-1, higher is more similar)
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

/**
 * Clear embedding cache
 */
export function clearCache(): void {
  embeddingCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  providers: Record<string, number>
} {
  const providers: Record<string, number> = {}

  for (const key of embeddingCache.keys()) {
    const provider = key.split(':')[0]
    providers[provider] = (providers[provider] || 0) + 1
  }

  return {
    size: embeddingCache.size,
    providers,
  }
}
