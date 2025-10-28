/**
 * 🔧 Working Memory Store
 *
 * Manages temporary task context and intermediate results.
 * Used during active crew operations to share context between agents.
 * Automatically expires entries after TTL.
 */

import type { MemoryConfig, MemoryEntry, MemoryQuery, MemoryStats, MemoryType } from './types.js'
import { MemoryImportance } from './types.js'

export class WorkingMemory {
  private entries: Map<string, MemoryEntry> = new Map()
  private maxEntries: number
  private ttlSeconds: number

  constructor(config: MemoryConfig['working']) {
    this.maxEntries = config.maxEntries
    this.ttlSeconds = config.ttlSeconds
  }

  /**
   * Add an entry to working memory
   */
  set(
    key: string,
    content: unknown,
    importance: MemoryImportance = MemoryImportance.MEDIUM,
    metadata?: Record<string, unknown>
  ): void {
    this.cleanup()

    // Evict if at capacity
    if (this.entries.size >= this.maxEntries) {
      this.evictLeastImportant()
    }

    const entry: MemoryEntry = {
      id: key,
      type: 'working' as MemoryType,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata,
      importance,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttlSeconds * 1000,
      accessCount: 0,
    }

    this.entries.set(key, entry)
  }

  /**
   * Get an entry from working memory
   */
  get(key: string): unknown | undefined {
    this.cleanup()

    const entry = this.entries.get(key)
    if (!entry) {
      return undefined
    }

    // Update access tracking
    entry.accessCount++
    entry.lastAccessedAt = Date.now()

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(entry.content)
    } catch {
      return entry.content
    }
  }

  /**
   * Get entry with metadata
   */
  getEntry(key: string): MemoryEntry | undefined {
    this.cleanup()

    const entry = this.entries.get(key)
    if (!entry) {
      return undefined
    }

    // Update access tracking
    entry.accessCount++
    entry.lastAccessedAt = Date.now()

    return entry
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    this.cleanup()
    return this.entries.has(key)
  }

  /**
   * Delete an entry
   */
  delete(key: string): boolean {
    return this.entries.delete(key)
  }

  /**
   * Search working memory
   */
  search(query: MemoryQuery): MemoryEntry[] {
    this.cleanup()

    let results = Array.from(this.entries.values())

    // Filter by query text
    if (query.query) {
      const lowerQuery = query.query.toLowerCase()
      results = results.filter((entry) => entry.content.toLowerCase().includes(lowerQuery))
    }

    // Filter by importance
    if (query.importance !== undefined) {
      results = results.filter((entry) => entry.importance >= query.importance!)
    }

    // Filter by time range
    if (query.timeRange) {
      results = results.filter(
        (entry) =>
          entry.timestamp >= query.timeRange?.start && entry.timestamp <= query.timeRange?.end
      )
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Get all entries
   */
  getAll(): MemoryEntry[] {
    this.cleanup()
    return Array.from(this.entries.values())
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear()
  }

  /**
   * Get statistics
   */
  getStats(): MemoryStats['working'] {
    this.cleanup()

    return {
      count: this.entries.size,
      capacity: this.maxEntries,
      utilizationPercent: (this.entries.size / this.maxEntries) * 100,
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private cleanup(): void {
    const now = Date.now()

    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.entries.delete(key)
      }
    }
  }

  private evictLeastImportant(): void {
    if (this.entries.size === 0) return

    // Find entry with lowest importance * accessCount score
    let minScore = Number.POSITIVE_INFINITY
    let evictKey: string | null = null

    for (const [key, entry] of this.entries.entries()) {
      const score = entry.importance * (entry.accessCount + 1)
      if (score < minScore) {
        minScore = score
        evictKey = key
      }
    }

    if (evictKey) {
      this.entries.delete(evictKey)
    }
  }
}
