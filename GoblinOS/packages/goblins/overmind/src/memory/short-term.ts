/**
 * 🗄️ Short-Term Memory Store
 *
 * Manages recent conversation history in memory.
 * Uses a circular buffer pattern with automatic expiration.
 * Thread-safe with in-memory storage for fast access.
 */

import type { Message } from '../types.js'
import type {
  MemoryConfig,
  MemoryEntry,
  MemoryImportance,
  MemoryStats,
  MemoryType,
} from './types.js'

export class ShortTermMemory {
  private messages: Message[] = []
  private maxMessages: number
  private ttlSeconds: number
  private accessLog: Map<string, number> = new Map()

  constructor(config: MemoryConfig['shortTerm']) {
    this.maxMessages = config.maxMessages
    this.ttlSeconds = config.ttlSeconds
  }

  /**
   * Add a message to short-term memory
   */
  add(message: Message): void {
    // Remove expired messages first
    this.cleanup()

    // Add new message
    this.messages.push(message)

    // Enforce max messages limit (circular buffer behavior)
    if (this.messages.length > this.maxMessages) {
      this.messages.shift()
    }

    // Track access
    const messageId = this.getMessageId(message)
    this.accessLog.set(messageId, Date.now())
  }

  /**
   * Get recent messages (optionally filtered by role)
   */
  getRecent(limit?: number, role?: 'system' | 'user' | 'assistant'): Message[] {
    this.cleanup()

    let filtered = this.messages
    if (role) {
      filtered = this.messages.filter((m) => m.role === role)
    }

    if (limit) {
      return filtered.slice(-limit)
    }
    return filtered
  }

  /**
   * Get all messages (for context building)
   */
  getAll(): Message[] {
    this.cleanup()
    return [...this.messages]
  }

  /**
   * Search messages by content
   */
  search(query: string, limit = 10): Message[] {
    this.cleanup()

    const lowerQuery = query.toLowerCase()
    const matches = this.messages.filter((m) => m.content.toLowerCase().includes(lowerQuery))

    return matches.slice(-limit)
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = []
    this.accessLog.clear()
  }

  /**
   * Get statistics
   */
  getStats(): MemoryStats['shortTerm'] {
    this.cleanup()

    const timestamps = this.messages.map((m) => {
      const id = this.getMessageId(m)
      return this.accessLog.get(id) || Date.now()
    })

    return {
      count: this.messages.length,
      oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : null,
    }
  }

  /**
   * Convert to memory entries (for export to long-term)
   */
  toMemoryEntries(): MemoryEntry[] {
    return this.messages.map((msg, index) => {
      const id = this.getMessageId(msg)
      const timestamp = this.accessLog.get(id) || Date.now()

      return {
        id: `short-term-${id}`,
        type: 'short-term' as MemoryType,
        content: msg.content,
        metadata: {
          role: msg.role,
          index,
        },
        importance: this.calculateImportance(msg),
        timestamp,
        accessCount: 1,
      }
    })
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private cleanup(): void {
    const now = Date.now()
    const cutoff = now - this.ttlSeconds * 1000

    // Remove messages older than TTL
    this.messages = this.messages.filter((msg) => {
      const id = this.getMessageId(msg)
      const timestamp = this.accessLog.get(id) || now
      return timestamp > cutoff
    })

    // Clean up access log
    for (const [id, timestamp] of this.accessLog.entries()) {
      if (timestamp < cutoff) {
        this.accessLog.delete(id)
      }
    }
  }

  private getMessageId(message: Message): string {
    // Create stable ID from message content and role
    const content = message.content.substring(0, 50)
    return `${message.role}-${content}`.replace(/[^a-zA-Z0-9]/g, '-')
  }

  private calculateImportance(message: Message): MemoryImportance {
    const content = message.content.toLowerCase()

    // System messages are critical
    if (message.role === 'system') {
      return 4 // CRITICAL
    }

    // Look for importance indicators
    const highImportance = ['error', 'critical', 'important', 'urgent', 'security']
    const mediumImportance = ['issue', 'problem', 'warning', 'attention']

    if (highImportance.some((word) => content.includes(word))) {
      return 3 // HIGH
    }

    if (mediumImportance.some((word) => content.includes(word))) {
      return 2 // MEDIUM
    }

    // User messages are generally medium importance
    if (message.role === 'user') {
      return 2 // MEDIUM
    }

    // Assistant messages are generally low importance
    return 1 // LOW
  }
}
