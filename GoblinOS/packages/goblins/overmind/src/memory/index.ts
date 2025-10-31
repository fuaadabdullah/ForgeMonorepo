/**
 * 🧠 Memory Manager
 *
 * Orchestrates all memory systems (short-term, working, long-term).
 * Provides unified interface for storing and retrieving memories.
 * Handles automatic memory consolidation and cleanup.
 */

import type { Message } from '../types.js'
import { LongTermMemory } from './long-term.js'
import { ShortTermMemory } from './short-term.js'
import type {
  Entity,
  Episode,
  MemoryConfig,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
} from './types.js'
import { MemoryConfigSchema, MemoryImportance, MemoryType } from './types.js'
import { WorkingMemory } from './working.js'

export class MemoryManager {
  private shortTerm: ShortTermMemory
  private working: WorkingMemory
  private longTerm: LongTermMemory
  private config: MemoryConfig
  private consolidationInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<MemoryConfig> = {}) {
    // Validate and set defaults
    this.config = MemoryConfigSchema.parse(config)

    // Initialize memory stores
    this.shortTerm = new ShortTermMemory(this.config.shortTerm)
    this.working = new WorkingMemory(this.config.working)
    this.longTerm = new LongTermMemory(this.config.longTerm)

    // Start automatic consolidation if long-term is enabled
    if (this.config.longTerm.enabled) {
      this.startConsolidation()
    }
  }

  // ============================================================================
  // Short-Term Memory (Conversation History)
  // ============================================================================

  /**
   * Add a message to conversation history
   */
  addMessage(message: Message): void {
    this.shortTerm.add(message)
  }

  /**
   * Get recent conversation messages
   */
  getRecentMessages(limit?: number, role?: 'system' | 'user' | 'assistant'): Message[] {
    return this.shortTerm.getRecent(limit, role)
  }

  /**
   * Get all conversation history
   */
  getConversationHistory(): Message[] {
    return this.shortTerm.getAll()
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.shortTerm.clear()
  }

  // ============================================================================
  // Working Memory (Task Context)
  // ============================================================================

  /**
   * Store temporary task context
   */
  setContext(key: string, value: string, metadata?: Record<string, unknown>): void {
    this.working.set(key, value, MemoryImportance.MEDIUM, metadata)
  }

  /**
   * Get task context
   */
  getContext(key: string): string | null {
    const value = this.working.get(key)
    return typeof value === 'string' ? value : null
  }

  /**
   * Check if context exists
   */
  hasContext(key: string): boolean {
    return this.working.has(key)
  }

  /**
   * Delete context
   */
  deleteContext(key: string): boolean {
    return this.working.delete(key)
  }

  /**
   * Clear all working memory
   */
  clearWorkingMemory(): void {
    this.working.clear()
  }

  /**
   * Get context suitable for Ollama inference (conversation + relevant memories)
   */
  async getContextForOllama(query: string): Promise<string[]> {
    const context: string[] = []

    // Add recent conversation history
    const recentMessages = this.getRecentMessages(10) // Last 10 messages
    if (recentMessages.length > 0) {
      context.push('Recent conversation:')
      for (const msg of recentMessages) {
        context.push(`${msg.role}: ${msg.content}`)
      }
    }

    // Add relevant long-term memories if enabled
    if (this.config.longTerm.enabled && query) {
      try {
        const memoryResults = await this.search({
          query,
          limit: 3,
          type: [MemoryType.LONG_TERM, MemoryType.EPISODIC],
        })

        if (memoryResults.length > 0) {
          context.push('\nRelevant memories:')
          for (const result of memoryResults) {
            // Only include entries with content (not entities)
            if ('content' in result.entry) {
              context.push(`- ${result.entry.content}`)
            }
          }
        }
      } catch (error) {
        // Memory search failed, continue without it
        console.warn('Memory search failed for Ollama context:', error)
      }
    }

    // Add working memory context if available
    const workingKeys = ['current_task', 'user_preferences', 'system_state']
    for (const key of workingKeys) {
      const value = this.getContext(key)
      if (value) {
        context.push(`\n${key.replace('_', ' ')}: ${value}`)
      }
    }

    return context
  }

  // ============================================================================
  // Long-Term Memory (Persistent Storage)
  // ============================================================================

  /**
   * Store a fact or insight permanently
   */
  async storeFact(content: string, metadata?: Record<string, unknown>): Promise<string> {
    if (!this.config.longTerm.enabled) {
      throw new Error('Long-term memory is disabled')
    }

    const importance = (metadata?.importance as MemoryImportance) || MemoryImportance.MEDIUM

    return this.longTerm.addMemory({
      type: MemoryType.LONG_TERM,
      content,
      metadata,
      importance,
      accessCount: 0,
    })
  }

  /**
   * Search all memories
   */
  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = []

    // Search working memory if no type specified or working is included
    if (
      !query.type ||
      query.type === MemoryType.WORKING ||
      (Array.isArray(query.type) && query.type.includes(MemoryType.WORKING))
    ) {
      const workingResults = this.working.search(query)
      results.push(
        ...workingResults.map((entry) => ({
          entry,
          score: 1.0,
          source: 'exact' as const,
        }))
      )
    }

    // Search short-term memory if text query provided
    if (query.query) {
      const shortTermResults = this.shortTerm.search(query.query, query.limit)
      const entries = this.shortTerm
        .toMemoryEntries()
        .filter((e) => shortTermResults.some((m) => m.content === e.content))
      results.push(
        ...entries.map((entry) => ({
          entry,
          score: 0.8,
          source: 'exact' as const,
        }))
      )
    }

    // Search long-term memory
    if (this.config.longTerm.enabled) {
      const longTermResults = await this.longTerm.searchMemories(query)
      results.push(
        ...longTermResults.map((entry) => ({
          entry,
          score: 0.9,
          source: 'exact' as const,
        }))
      )
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    // Apply overall limit
    if (query.limit) {
      return results.slice(0, query.limit)
    }

    return results
  }

  // ============================================================================
  // Entity Memory
  // ============================================================================

  /**
   * Extract and store an entity mention
   */
  async trackEntity(
    name: string,
    type: Entity['type'],
    attributes: Record<string, unknown> = {},
    confidence = 1.0
  ): Promise<string> {
    if (!this.config.entities.enabled) {
      throw new Error('Entity tracking is disabled')
    }

    // Check if entity already exists
    const existing = await this.longTerm.findEntityByName(name)

    if (existing) {
      // Update existing entity
      await this.longTerm.updateEntity(existing.id, {
        lastMentioned: Date.now(),
        mentionCount: existing.mentionCount + 1,
        attributes: { ...existing.attributes, ...attributes },
        confidence: Math.max(existing.confidence, confidence),
      })
      return existing.id
    }

    // Create new entity
    return this.longTerm.addEntity({
      name,
      type,
      attributes,
      firstMentioned: Date.now(),
      lastMentioned: Date.now(),
      mentionCount: 1,
      confidence,
    })
  }

  /**
   * Get an entity by ID
   */
  async getEntity(id: string): Promise<Entity | null> {
    return this.longTerm.getEntity(id)
  }

  /**
   * Search for entities
   */
  async searchEntities(query: string, limit = 10): Promise<Entity[]> {
    return this.longTerm.searchEntities(query, limit)
  }

  // ============================================================================
  // Episodic Memory
  // ============================================================================

  /**
   * Create an episode from recent conversation
   */
  async createEpisode(title: string, summary: string, tags: string[] = []): Promise<string> {
    if (!this.config.episodes.enabled) {
      throw new Error('Episodic memory is disabled')
    }

    const messages = this.shortTerm.getAll()

    if (messages.length < this.config.episodes.minMessagesPerEpisode) {
      throw new Error(
        `Episode requires at least ${this.config.episodes.minMessagesPerEpisode} messages`
      )
    }

    const episode: Omit<Episode, 'id'> = {
      title,
      summary,
      messages,
      startTime: Date.now() - messages.length * 60000, // Rough estimate
      endTime: Date.now(),
      participants: ['user', 'overmind'], // TODO: Extract from messages
      entities: [], // TODO: Link to entity IDs
      tags,
      importance: 2, // Default to MEDIUM
    }

    return this.longTerm.addEpisode(episode)
  }

  /**
   * Get an episode by ID
   */
  async getEpisode(id: string): Promise<Episode | null> {
    return this.longTerm.getEpisode(id)
  }

  /**
   * Search episodes
   */
  async searchEpisodes(query: string, limit = 10): Promise<Episode[]> {
    return this.longTerm.searchEpisodes(query, limit)
  }

  /**
   * Get recent episodes
   */
  async getRecentEpisodes(limit = 10): Promise<Episode[]> {
    return this.longTerm.getRecentEpisodes(limit)
  }

  // ============================================================================
  // Statistics and Maintenance
  // ============================================================================

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const longTermStats = await this.longTerm.getStats()

    return {
      shortTerm: this.shortTerm.getStats(),
      working: this.working.getStats(),
      longTerm: longTermStats,
      vectorStore: {
        enabled: this.config.vectorSearch.enabled,
        indexedEntries: 0, // TODO: Implement vector store
        dimensionality: this.config.longTerm.vectorDimensions,
      },
    }
  }

  /**
   * Consolidate short-term memories to long-term
   */
  async consolidate(): Promise<number> {
    if (!this.config.longTerm.enabled) {
      return 0
    }

    const entries = this.shortTerm.toMemoryEntries()
    let consolidated = 0

    for (const entry of entries) {
      // Only consolidate important memories
      if (entry.importance >= 2) {
        // MEDIUM or higher
        await this.longTerm.addMemory({
          type: MemoryType.EPISODIC,
          content: entry.content,
          metadata: entry.metadata,
          importance: entry.importance,
          accessCount: 0,
        })
        consolidated++
      }
    }

    return consolidated
  }

  /**
   * Clean up expired memories
   */
  async cleanup(): Promise<void> {
    if (this.config.longTerm.enabled) {
      await this.longTerm.cleanup()
    }
  }

  /**
   * Shutdown memory manager
   */
  shutdown(): void {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval)
      this.consolidationInterval = null
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private startConsolidation(): void {
    // Consolidate memories every 5 minutes
    this.consolidationInterval = setInterval(
      async () => {
        try {
          await this.consolidate()
          await this.cleanup()
        } catch (error) {
          console.error('Memory consolidation error:', error)
        }
      },
      5 * 60 * 1000
    )
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a memory manager with default configuration
 */
export function createMemoryManager(config: Partial<MemoryConfig> = {}): MemoryManager {
  return new MemoryManager(config)
}

// Re-export types for convenience
export * from './types.js'
