/**
 * RAG Retrieval - Query Processing and Context Injection
 *
 * Orchestrates the RAG pipeline:
 * 1. Query embedding generation
 * 2. Top-k similarity search
 * 3. Context formatting and injection
 * 4. Re-ranking (optional)
 *
 * @module rag/retrieval
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { type EmbeddingConfig, embed } from './embeddings.js'
import type { SearchOptions, SearchResult, VectorStore } from './vector-store.js'

/**
 * Retrieval configuration
 */
export interface RetrievalConfig {
  embedding?: EmbeddingConfig
  search?: SearchOptions
  contextFormat?: 'inline' | 'system' | 'user'
  maxContextLength?: number // Max characters in context
  includeScores?: boolean // Include similarity scores in context
}

/**
 * Retrieval result
 */
export interface RetrievalResult {
  query: string
  results: SearchResult[]
  context: string
  tokensApprox: number
}

/**
 * Retrieve relevant documents for a query
 *
 * @param query - User query
 * @param vectorStore - Vector store to search
 * @param config - Retrieval configuration
 * @returns Retrieval result with context
 */
export async function retrieve(
  query: string,
  vectorStore: VectorStore,
  config: RetrievalConfig = {}
): Promise<RetrievalResult> {
  // Generate query embedding
  const queryEmbedding = await embed(query, config.embedding)

  // Search vector store
  const results = vectorStore.search(queryEmbedding.vector, config.search)

  // Format context
  const context = formatContext(results, config)

  return {
    query,
    results,
    context,
    tokensApprox: estimateTokens(context),
  }
}

/**
 * Format search results into context string
 *
 * @param results - Search results
 * @param config - Retrieval configuration
 * @returns Formatted context
 */
function formatContext(results: SearchResult[], config: RetrievalConfig): string {
  if (results.length === 0) {
    return ''
  }

  const maxLength = config.maxContextLength || 4000
  const includeScores = config.includeScores ?? false

  let context = ''
  const chunks: string[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]

    let chunk = `[${i + 1}] ${result.document.content}`

    if (includeScores) {
      chunk += ` (relevance: ${result.score.toFixed(3)})`
    }

    // Check if adding this chunk would exceed max length
    const newLength = context.length + chunk.length + (chunks.length > 0 ? 2 : 0) // +2 for newlines

    if (newLength > maxLength && chunks.length > 0) {
      break // Stop adding chunks
    }

    chunks.push(chunk)
    context = chunks.join('\n\n')
  }

  return context
}

/**
 * Inject retrieved context into messages
 *
 * @param messages - Original messages
 * @param context - Retrieved context
 * @param format - How to inject context
 * @returns Messages with injected context
 */
export function injectContext(
  messages: ChatCompletionMessageParam[],
  context: string,
  format: 'inline' | 'system' | 'user' = 'system'
): ChatCompletionMessageParam[] {
  if (!context) {
    return messages
  }

  const contextMessage = `## Retrieved Context\n\n${context}\n\n---\n\nUse the above context to answer the user's question. If the context doesn't contain relevant information, say so.`

  switch (format) {
    case 'system':
      // Add as system message at the beginning
      return [{ role: 'system', content: contextMessage }, ...messages]

    case 'user': {
      // Add as user message before the last user message
      const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user')
      if (lastUserIndex === -1) {
        return messages
      }

      const updated = [...messages]
      updated.splice(lastUserIndex, 0, {
        role: 'user',
        content: contextMessage,
      })
      return updated
    }

    case 'inline': {
      // Prepend to the last user message
      const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user')
      if (lastUserIdx === -1) {
        return messages
      }

      const copy = [...messages]
      const lastMsg = copy[lastUserIdx]

      if (typeof lastMsg.content === 'string') {
        copy[lastUserIdx] = {
          ...lastMsg,
          content: `${contextMessage}\n\n${lastMsg.content}`,
        }
      }

      return copy
    }

    default:
      return messages
  }
}

/**
 * Estimate token count from text
 *
 * Uses rough approximation: 1 token ≈ 4 characters
 * For production, use tiktoken or actual tokenizer
 *
 * @param text - Text to estimate
 * @returns Approximate token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * RAG-enabled chat: retrieve → inject → LLM
 *
 * Complete RAG pipeline in one function
 *
 * @param query - User query
 * @param vectorStore - Vector store
 * @param messages - Chat messages
 * @param config - Retrieval config
 * @returns Messages with injected context
 */
export async function ragChat(
  query: string,
  vectorStore: VectorStore,
  messages: ChatCompletionMessageParam[],
  config: RetrievalConfig = {}
): Promise<{
  messages: ChatCompletionMessageParam[]
  retrieval: RetrievalResult
}> {
  // Retrieve relevant context
  const retrieval = await retrieve(query, vectorStore, config)

  // Inject context into messages
  const format = config.contextFormat || 'system'
  const updatedMessages = injectContext(messages, retrieval.context, format)

  return {
    messages: updatedMessages,
    retrieval,
  }
}

/**
 * Re-rank search results (optional advanced feature)
 *
 * Uses a cross-encoder model to re-rank results based on query-document pairs
 * This is more accurate than pure cosine similarity but slower
 *
 * @param query - User query
 * @param results - Initial search results
 * @returns Re-ranked results
 */
export async function rerank(_query: string, results: SearchResult[]): Promise<SearchResult[]> {
  // TODO: Implement cross-encoder re-ranking
  // For now, return results as-is
  // In production, use models like:
  // - ms-marco-MiniLM-L-6-v2
  // - cross-encoder/ms-marco-TinyBERT-L-2-v2

  return results
}
