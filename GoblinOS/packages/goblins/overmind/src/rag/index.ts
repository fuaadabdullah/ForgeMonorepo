/**
 * RAG Module - Retrieval-Augmented Generation Pipeline
 *
 * Complete local RAG system:
 * - Embeddings (Ollama nomic-embed-text, OpenAI)
 * - Vector store (in-memory with persistence)
 * - Document chunking (text, sentence, markdown)
 * - Top-k retrieval with context injection
 *
 * @module rag
 */

// Embeddings
export {
  type EmbeddingVector,
  type EmbeddingResult,
  type EmbeddingProvider,
  type EmbeddingConfig,
  embed,
  embedBatch,
  cosineSimilarity,
  clearCache as clearEmbeddingCache,
  getCacheStats as getEmbeddingCacheStats,
} from './embeddings.js'

// Vector Store
export {
  type Document,
  type SearchResult,
  type SearchOptions,
  VectorStore,
  createVectorStore,
} from './vector-store.js'

// Retrieval
export {
  type RetrievalConfig,
  type RetrievalResult,
  retrieve,
  injectContext,
  ragChat,
  rerank,
} from './retrieval.js'

// Chunking
export {
  type Chunk,
  type ChunkingConfig,
  chunkText,
  chunkBySentence,
  chunkMarkdown,
} from './chunking.js'
