/**
 * Vector Store - Local Vector Database
 *
 * In-memory vector store with persistence support:
 * - Add/update/delete documents with embeddings
 * - Top-k similarity search
 * - Filtering by metadata
 * - Persistence to JSON file
 *
 * For production, consider replacing with:
 * - Chroma (local-first, persistent)
 * - Pinecone (cloud, scalable)
 * - Qdrant (local or cloud)
 *
 * @module rag/vector-store
 */

import { type EmbeddingVector, cosineSimilarity } from './embeddings.js'

/**
 * Document with embedding
 */
export interface Document {
  id: string
  content: string
  embedding: EmbeddingVector
  metadata?: Record<string, unknown>
  timestamp: number
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  document: Document
  score: number
}

/**
 * Search options
 */
export interface SearchOptions {
  k?: number // Top-k results (default: 5)
  minScore?: number // Minimum similarity threshold (default: 0.0)
  filter?: (doc: Document) => boolean // Metadata filter function
}

/**
 * In-memory vector store
 */
export class VectorStore {
  private documents: Map<string, Document> = new Map()

  /**
   * Add or update a document
   *
   * @param doc - Document with embedding
   */
  add(doc: Document): void {
    this.documents.set(doc.id, {
      ...doc,
      timestamp: Date.now(),
    })
  }

  /**
   * Add multiple documents
   *
   * @param docs - Array of documents
   */
  addBatch(docs: Document[]): void {
    for (const doc of docs) {
      this.add(doc)
    }
  }

  /**
   * Get document by ID
   *
   * @param id - Document ID
   * @returns Document or undefined
   */
  get(id: string): Document | undefined {
    return this.documents.get(id)
  }

  /**
   * Delete document by ID
   *
   * @param id - Document ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): boolean {
    return this.documents.delete(id)
  }

  /**
   * Search for similar documents
   *
   * @param queryEmbedding - Query vector
   * @param options - Search options
   * @returns Top-k similar documents with scores
   */
  search(queryEmbedding: EmbeddingVector, options: SearchOptions = {}): SearchResult[] {
    const k = options.k || 5
    const minScore = options.minScore || 0.0

    // Compute similarities
    const results: SearchResult[] = []

    for (const doc of this.documents.values()) {
      // Apply filter if provided
      if (options.filter && !options.filter(doc)) {
        continue
      }

      const score = cosineSimilarity(queryEmbedding, doc.embedding)

      if (score >= minScore) {
        results.push({ document: doc, score })
      }
    }

    // Sort by score descending and return top-k
    return results.sort((a, b) => b.score - a.score).slice(0, k)
  }

  /**
   * Get all document IDs
   *
   * @returns Array of document IDs
   */
  listIds(): string[] {
    return Array.from(this.documents.keys())
  }

  /**
   * Get total number of documents
   *
   * @returns Document count
   */
  size(): number {
    return this.documents.size
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear()
  }

  /**
   * Serialize store to JSON
   *
   * @returns JSON string
   */
  toJSON(): string {
    const data = Array.from(this.documents.values())
    return JSON.stringify(data, null, 2)
  }

  /**
   * Load documents from JSON
   *
   * @param json - JSON string from toJSON()
   */
  fromJSON(json: string): void {
    const data = JSON.parse(json) as Document[]
    this.documents.clear()

    for (const doc of data) {
      this.documents.set(doc.id, doc)
    }
  }

  /**
   * Get statistics
   *
   * @returns Store statistics
   */
  stats(): {
    totalDocuments: number
    avgEmbeddingDimension: number
    oldestDocument: number
    newestDocument: number
  } {
    const docs = Array.from(this.documents.values())

    if (docs.length === 0) {
      return {
        totalDocuments: 0,
        avgEmbeddingDimension: 0,
        oldestDocument: 0,
        newestDocument: 0,
      }
    }

    const avgDimension = docs.reduce((sum, doc) => sum + doc.embedding.length, 0) / docs.length
    const timestamps = docs.map((d) => d.timestamp)

    return {
      totalDocuments: docs.length,
      avgEmbeddingDimension: Math.round(avgDimension),
      oldestDocument: Math.min(...timestamps),
      newestDocument: Math.max(...timestamps),
    }
  }
}

/**
 * Create a new vector store instance
 *
 * @returns New VectorStore
 */
export function createVectorStore(): VectorStore {
  return new VectorStore()
}
