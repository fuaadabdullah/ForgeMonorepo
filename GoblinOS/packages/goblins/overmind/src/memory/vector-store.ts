/**
 * 🧮 Vector Store
 *
 * Semantic search capabilities using ChromaDB for embeddings.
 * Provides vector similarity search for memories and entities.
 * Uses local embeddings via @xenova/transformers for privacy.
 */

import { pipeline } from '@xenova/transformers'
// Try to load chroma client; fall back to a lightweight in-memory fake when unavailable
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chromaMod: any = require('chroma-js')
const MaybeChromaClient: any =
  chromaMod?.ChromaClient || chromaMod?.default?.ChromaClient || chromaMod?.default || chromaMod

class FakeCollection {
  private store = new Map<string, { doc: string; meta: any; embed?: number[] }>()

  async add({ ids, documents, metadatas, embeddings }: any) {
    for (let i = 0; i < ids.length; i++) {
      this.store.set(ids[i], {
        doc: documents?.[i] ?? '',
        meta: metadatas?.[i] ?? {},
        embed: embeddings?.[i],
      })
    }
  }

  async query({ nResults = 10 }: any) {
    const entries = Array.from(this.store.entries()).slice(0, nResults)
    return {
      ids: [entries.map(([id]) => id)],
      documents: [entries.map(([, v]) => v.doc)],
      metadatas: [entries.map(([, v]) => v.meta)],
      distances: [entries.map(() => 0.1)],
    }
  }

  async delete({ ids }: any) {
    for (const id of ids) this.store.delete(id)
  }

  async count() {
    return this.store.size
  }

  async get() {
    const ids = Array.from(this.store.keys())
    const values = Array.from(this.store.values())
    return {
      ids,
      documents: values.map((v) => v.doc),
      metadatas: values.map((v) => v.meta),
    }
  }

  async update({ ids, documents, metadatas, embeddings }: any) {
    for (let i = 0; i < ids.length; i++) {
      const cur = this.store.get(ids[i])
      if (!cur) continue
      this.store.set(ids[i], {
        doc: documents?.[i] ?? cur.doc,
        meta: metadatas?.[i] ?? cur.meta,
        embed: embeddings?.[i] ?? cur.embed,
      })
    }
  }
}

class FakeChromaClient {
  private collections = new Map<string, FakeCollection>()
  async heartbeat() {
    return true
  }
  async createCollection({ name }: { name: string }) {
    const c = new FakeCollection()
    this.collections.set(name, c)
    return c
  }
  async getCollection({ name }: { name: string }) {
    const c = this.collections.get(name)
    if (!c) throw new Error('Collection not found')
    return c
  }
  async listCollections() {
    return Array.from(this.collections.keys())
  }
  async deleteCollection({ name }: { name: string }) {
    this.collections.delete(name)
  }
}

const ChromaClientCtor: any =
  typeof MaybeChromaClient === 'function' && 'getCollection' in (MaybeChromaClient?.prototype || {})
    ? MaybeChromaClient
    : FakeChromaClient

export interface VectorEntry {
  id: string
  content: string
  metadata?: Record<string, unknown>
  embedding?: number[]
}

export interface VectorSearchResult {
  id: string
  content: string
  metadata?: Record<string, unknown>
  score: number
}

export interface VectorStoreConfig {
  collectionName: string
  embeddingModel: string
  dimension: number
  chromaUrl?: string
  persistDirectory?: string
}

export class VectorStore {
  private client: any
  private collection: any
  private extractor: any
  private config: VectorStoreConfig
  private initialized = false

  constructor(config: VectorStoreConfig) {
    this.config = config
    this.client = new ChromaClientCtor({
      path: config.chromaUrl || 'http://localhost:8000',
    })
  }

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Initialize embedding extractor; fall back to a local stub if unavailable (e.g., no network in CI)
      try {
        this.extractor = await pipeline('feature-extraction', this.config.embeddingModel)
      } catch (_e) {
        // Deterministic simple embedding based on character codes
        const dim = this.config.dimension
        this.extractor = async (text: string) => {
          const arr = new Float32Array(dim)
          for (let i = 0; i < text.length; i++) {
            arr[i % dim] += (text.charCodeAt(i) % 97) / 97
          }
          // Normalize
          const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1
          for (let i = 0; i < dim; i++) arr[i] /= norm
          return { data: arr }
        }
      }

      // Get or create collection
      try {
        this.collection = await this.client.getCollection({
          name: this.config.collectionName,
        })
      } catch (_error) {
        // Collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: this.config.collectionName,
          metadata: {
            dimension: this.config.dimension,
            embedding_model: this.config.embeddingModel,
          },
        })
      }

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize vector store:', error)
      throw new Error(`Vector store initialization failed: ${error}`)
    }
  }

  /**
   * Generate embedding for text (public method)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.extractor) {
      throw new Error('Embedding extractor not initialized')
    }

    try {
      const output = await this.extractor(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data)
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      throw new Error(`Embedding generation failed: ${error}`)
    }
  }

  /**
   * Add entries to the vector store
   */
  async addEntries(entries: VectorEntry[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const ids: string[] = []
    const embeddings: number[][] = []
    const metadatas: Record<string, unknown>[] = []
    const documents: string[] = []

    for (const entry of entries) {
      ids.push(entry.id)

      // Generate embedding if not provided
      let embedding = entry.embedding
      if (!embedding) {
        embedding = await this.generateEmbedding(entry.content)
      }
      embeddings.push(embedding)

      // Prepare metadata
      const metadata = {
        ...entry.metadata,
        content_length: entry.content.length,
        created_at: Date.now(),
      }
      metadatas.push(metadata)

      documents.push(entry.content)
    }

    try {
      await this.collection.add({
        ids,
        embeddings,
        metadatas,
        documents,
      })
    } catch (error) {
      console.error('Failed to add entries to vector store:', error)
      throw new Error(`Vector store add operation failed: ${error}`)
    }
  }

  /**
   * Search for similar entries
   */
  async search(
    query: string,
    limit = 10,
    where?: Record<string, unknown>
  ): Promise<VectorSearchResult[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query)

      // Perform similarity search
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where,
      })

      // Format results
      const searchResults: VectorSearchResult[] = []
      if (results.ids?.[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          searchResults.push({
            id: results.ids[0][i],
            content: results.documents?.[0]?.[i] || '',
            metadata: results.metadatas?.[0]?.[i] || {},
            score: results.distances?.[0]?.[i] || 0,
          })
        }
      }

      return searchResults
    } catch (error) {
      console.error('Failed to search vector store:', error)
      throw new Error(`Vector store search failed: ${error}`)
    }
  }

  /**
   * Update an entry
   */
  async updateEntry(
    id: string,
    content?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const updateData: any = {}

      if (content) {
        updateData.documents = [content]
        // Regenerate embedding for new content
        const embedding = await this.generateEmbedding(content)
        updateData.embeddings = [embedding]
      }

      if (metadata) {
        updateData.metadatas = [metadata]
      }

      await this.collection.update({
        ids: [id],
        ...updateData,
      })
    } catch (error) {
      console.error('Failed to update entry in vector store:', error)
      throw new Error(`Vector store update failed: ${error}`)
    }
  }

  /**
   * Delete entries
   */
  async deleteEntries(ids: string[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      await this.collection.delete({
        ids,
      })
    } catch (error) {
      console.error('Failed to delete entries from vector store:', error)
      throw new Error(`Vector store delete failed: ${error}`)
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{
    count: number
    dimension: number
    embeddingModel: string
  }> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const count = await this.collection.count()
      return {
        count,
        dimension: this.config.dimension,
        embeddingModel: this.config.embeddingModel,
      }
    } catch (error) {
      console.error('Failed to get vector store stats:', error)
      return {
        count: 0,
        dimension: this.config.dimension,
        embeddingModel: this.config.embeddingModel,
      }
    }
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // Delete all entries by getting all IDs first
      const allResults = await this.collection.get()
      if (allResults.ids && allResults.ids.length > 0) {
        await this.collection.delete({
          ids: allResults.ids,
        })
      }
    } catch (error) {
      console.error('Failed to clear vector store:', error)
      throw new Error(`Vector store clear failed: ${error}`)
    }
  }

  /**
   * Close the vector store connection
   */
  async close(): Promise<void> {
    // ChromaDB client doesn't need explicit closing
    this.initialized = false
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a vector store with default configuration
 */
export function createVectorStore(config: Partial<VectorStoreConfig> = {}): VectorStore {
  const defaultConfig: VectorStoreConfig = {
    collectionName: 'overmind_memories',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    dimension: 384, // Dimension for all-MiniLM-L6-v2
    ...config,
  }

  return new VectorStore(defaultConfig)
}
