/**
 * 💾 Long-Term Memory Store
 *
 * Persistent storage using SQLite for facts, entities, and episodes.
 * Provides CRUD operations and basic querying.
 * Designed to be extended with vector search capabilities.
 */

import type {
  Entity,
  Episode,
  MemoryConfig,
  MemoryEntry,
  MemoryQuery,
  MemoryStats,
  MemoryType,
} from './types.js'

/**
 * Simple in-memory implementation of long-term storage
 * TODO: Replace with actual SQLite implementation using better-sqlite3
 */
export class LongTermMemory {
  private memories: Map<string, MemoryEntry> = new Map()
  private entities: Map<string, Entity> = new Map()
  private episodes: Map<string, Episode> = new Map()
  private config: MemoryConfig['longTerm']

  constructor(config: MemoryConfig['longTerm']) {
    this.config = config
    // TODO: Initialize SQLite database at config.dbPath
  }

  // ============================================================================
  // Memory Operations
  // ============================================================================

  /**
   * Store a memory entry
   */
  addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): string {
    const id = this.generateId('memory')
    const fullEntry: MemoryEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
      accessCount: 0,
    }

    this.memories.set(id, fullEntry)
    return id
  }

  /**
   * Get a memory by ID
   */
  getMemory(id: string): MemoryEntry | undefined {
    const memory = this.memories.get(id)
    if (!memory) return undefined

    // Update access tracking
    memory.accessCount++
    memory.lastAccessedAt = Date.now()

    return memory
  }

  /**
   * Search memories
   */
  searchMemories(query: MemoryQuery): MemoryEntry[] {
    let results = Array.from(this.memories.values())

    // Filter by type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type]
      results = results.filter((m) => types.includes(m.type))
    }

    // Filter by text query
    if (query.query) {
      const lowerQuery = query.query.toLowerCase()
      results = results.filter((m) => m.content.toLowerCase().includes(lowerQuery))
    }

    // Filter by importance
    if (query.importance !== undefined) {
      results = results.filter((m) => m.importance >= query.importance!)
    }

    // Filter by time range
    if (query.timeRange) {
      results = results.filter(
        (m) => m.timestamp >= query.timeRange?.start && m.timestamp <= query.timeRange?.end
      )
    }

    // Filter expired unless requested
    if (!query.includeExpired) {
      const now = Date.now()
      results = results.filter((m) => !m.expiresAt || m.expiresAt > now)
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Delete a memory
   */
  deleteMemory(id: string): boolean {
    return this.memories.delete(id)
  }

  // ============================================================================
  // Entity Operations
  // ============================================================================

  /**
   * Store an entity
   */
  addEntity(entity: Omit<Entity, 'id'>): string {
    const id = this.generateId('entity')
    const fullEntity: Entity = {
      ...entity,
      id,
    }

    this.entities.set(id, fullEntity)
    return id
  }

  /**
   * Get an entity by ID
   */
  getEntity(id: string): Entity | null {
    return this.entities.get(id) || null
  }

  /**
   * Find entity by name
   */
  findEntityByName(name: string): Entity | null {
    for (const entity of this.entities.values()) {
      if (entity.name.toLowerCase() === name.toLowerCase()) {
        return entity
      }
    }
    return null
  }

  /**
   * Update entity
   */
  updateEntity(id: string, updates: Partial<Entity>): boolean {
    const entity = this.entities.get(id)
    if (!entity) return false

    Object.assign(entity, updates)
    this.entities.set(id, entity)
    return true
  }

  /**
   * Search entities
   */
  searchEntities(query: string, limit = 10): Entity[] {
    const lowerQuery = query.toLowerCase()
    const results: Entity[] = []

    for (const entity of this.entities.values()) {
      if (
        entity.name.toLowerCase().includes(lowerQuery) ||
        (entity.attributes && JSON.stringify(entity.attributes).toLowerCase().includes(lowerQuery))
      ) {
        results.push(entity)
      }

      if (results.length >= limit) break
    }

    return results
  }

  /**
   * Get all entities of a type
   */
  getEntitiesByType(type: Entity['type'], limit?: number): Entity[] {
    const results = Array.from(this.entities.values()).filter((e) => e.type === type)

    return limit ? results.slice(0, limit) : results
  }

  // ============================================================================
  // Episode Operations
  // ============================================================================

  /**
   * Store an episode
   */
  addEpisode(episode: Omit<Episode, 'id'>): string {
    const id = this.generateId('episode')
    const fullEpisode: Episode = {
      ...episode,
      id,
    }

    this.episodes.set(id, fullEpisode)
    return id
  }

  /**
   * Get an episode by ID
   */
  getEpisode(id: string): Episode | null {
    return this.episodes.get(id) || null
  }

  /**
   * Search episodes
   */
  searchEpisodes(query: string, limit = 10): Episode[] {
    const lowerQuery = query.toLowerCase()
    const results: Episode[] = []

    for (const episode of this.episodes.values()) {
      if (
        episode.title.toLowerCase().includes(lowerQuery) ||
        episode.summary.toLowerCase().includes(lowerQuery) ||
        episode.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(episode)
      }

      if (results.length >= limit) break
    }

    return results
  }

  /**
   * Get recent episodes
   */
  getRecentEpisodes(limit = 10): Episode[] {
    const sorted = Array.from(this.episodes.values()).sort((a, b) => b.endTime - a.endTime)
    return sorted.slice(0, limit)
  }

  // ============================================================================
  // Statistics and Maintenance
  // ============================================================================

  /**
   * Get statistics
   */
  getStats(): MemoryStats['longTerm'] {
    return {
      memories: this.memories.size,
      entities: this.entities.size,
      episodes: this.episodes.size,
      dbSizeMB: 0, // TODO: Calculate actual DB size
    }
  }

  /**
   * Clean up expired memories
   */
  cleanup(): number {
    const now = Date.now()
    let deleted = 0

    for (const [id, memory] of this.memories.entries()) {
      if (memory.expiresAt && memory.expiresAt < now) {
        this.memories.delete(id)
        deleted++
      }
    }

    return deleted
  }

  /**
   * Clear all data (dangerous!)
   */
  clearAll(): void {
    this.memories.clear()
    this.entities.clear()
    this.episodes.clear()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateId(prefix: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `${prefix}-${timestamp}-${random}`
  }
}
