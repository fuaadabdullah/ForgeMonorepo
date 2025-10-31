/**
 * 💾 Long-Term Memory Store
 *
 * Persistent storage using SQLite for facts, entities, and episodes.
 * Provides CRUD operations and vector search capabilities.
 * Integrates with ChromaDB for semantic search.
 */

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import type {
  Entity,
  Episode,
  MemoryConfig,
  MemoryEntry,
  MemoryQuery,
  MemoryStats,
  MemoryType,
} from './types.js'
// TODO: Implement vector store integration
// import { VectorStore } from './vector-store.js'

/**
 * Simple in-memory implementation of long-term storage
 * TODO: Replace with actual SQLite implementation using better-sqlite3
 */
export class LongTermMemory {
  private db: Database.Database
  // TODO: Implement vector store integration
  // private _vectorStore: VectorStore | null = null
  // TODO: Use config for database path and other settings
  // private _config: MemoryConfig['longTerm']

  // Prepared statements for better performance
  private insertMemoryStmt!: Database.Statement
  private getMemoryStmt!: Database.Statement
  private updateMemoryAccessStmt!: Database.Statement
  private deleteMemoryStmt!: Database.Statement
  private searchMemoriesStmt!: Database.Statement

  private insertEntityStmt!: Database.Statement
  private getEntityStmt!: Database.Statement
  private updateEntityStmt!: Database.Statement
  private findEntityByNameStmt!: Database.Statement

  private insertEpisodeStmt!: Database.Statement
  private getEpisodeStmt!: Database.Statement

  constructor(config: MemoryConfig['longTerm']) {
    // TODO: Use config for database path and other settings
    // this._config = config

    // Ensure database directory exists
    const dir = path.dirname(config.dbPath)
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Initialize SQLite database
    this.db = new Database(config.dbPath)

    // Create tables if they don't exist
    this.initializeTables()

    // Initialize vector store if vector search is enabled
    // TODO: Implement vector store integration
    // if (config.vectorDimensions && config.vectorDimensions > 0) {
    //   this._vectorStore = new VectorStore({
    //     collectionName: 'overmind_memories',
    //     embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    //     dimension: config.vectorDimensions,
    //   })
    // }

    // Prepare statements
    this.prepareStatements()
  }

  private initializeTables(): void {
    // Memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT, -- JSON
        importance INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        expires_at INTEGER,
        access_count INTEGER DEFAULT 0,
        last_accessed_at INTEGER,
        embedding TEXT -- JSON array
      )
    `)

    // Entities table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        attributes TEXT, -- JSON
        first_mentioned INTEGER NOT NULL,
        last_mentioned INTEGER NOT NULL,
        mention_count INTEGER DEFAULT 1,
        confidence REAL DEFAULT 1.0
      )
    `)

    // Episodes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        messages TEXT NOT NULL, -- JSON
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        participants TEXT, -- JSON
        entities TEXT, -- JSON
        tags TEXT, -- JSON
        importance INTEGER DEFAULT 2
      )
    `)

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
      CREATE INDEX IF NOT EXISTS idx_episodes_start_time ON episodes(start_time);
    `)
  }

  private prepareStatements(): void {
    // Memory statements
    this.insertMemoryStmt = this.db.prepare(`
      INSERT INTO memories (id, type, content, metadata, importance, timestamp, expires_at, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.getMemoryStmt = this.db.prepare(`
      SELECT * FROM memories WHERE id = ?
    `)

    this.updateMemoryAccessStmt = this.db.prepare(`
      UPDATE memories SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?
    `)

    this.deleteMemoryStmt = this.db.prepare(`
      DELETE FROM memories WHERE id = ?
    `)

    this.searchMemoriesStmt = this.db.prepare(`
      SELECT * FROM memories
      WHERE (? IS NULL OR type = ?)
        AND (? IS NULL OR content LIKE ?)
        AND (? IS NULL OR importance >= ?)
        AND (? IS NULL OR timestamp >= ?)
        AND (? IS NULL OR timestamp <= ?)
        AND (? = 0 OR expires_at IS NULL OR expires_at > ?)
      ORDER BY timestamp DESC
      LIMIT ?
    `)

    // Entity statements
    this.insertEntityStmt = this.db.prepare(`
      INSERT INTO entities (id, name, type, attributes, first_mentioned, last_mentioned, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    this.getEntityStmt = this.db.prepare(`
      SELECT * FROM entities WHERE id = ?
    `)

    this.updateEntityStmt = this.db.prepare(`
      UPDATE entities SET name = ?, type = ?, attributes = ?, last_mentioned = ?, mention_count = ?, confidence = ? WHERE id = ?
    `)

    this.findEntityByNameStmt = this.db.prepare(`
      SELECT * FROM entities WHERE LOWER(name) = LOWER(?)
    `)

    // Episode statements
    this.insertEpisodeStmt = this.db.prepare(`
      INSERT INTO episodes (id, title, summary, messages, start_time, end_time, participants, entities, tags, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.getEpisodeStmt = this.db.prepare(`
      SELECT * FROM episodes WHERE id = ?
    `)
  }

  // ============================================================================
  // Memory Operations
  // ============================================================================

  /**
   * Store a memory entry
   */
  addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): string {
    const id = this.generateId('memory')
    const now = Date.now()

    // Embedding generation is deferred/optional for tests; store null here
    const embedding: string | null = null

    this.insertMemoryStmt.run(
      id,
      entry.type,
      entry.content,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.importance,
      now,
      entry.expiresAt || null,
      embedding
    )

    return id
  }

  /**
   * Get a memory by ID
   */
  getMemory(id: string): MemoryEntry | undefined {
    const row = this.getMemoryStmt.get(id) as any
    if (!row) return undefined

    // Update access tracking
    this.updateMemoryAccessStmt.run(Date.now(), id)

    return this.rowToMemoryEntry(row)
  }

  /**
   * Search memories
   */
  searchMemories(query: MemoryQuery): MemoryEntry[] {
    const now = Date.now()

    const rows = this.searchMemoriesStmt.all(
      query.type ? (Array.isArray(query.type) ? query.type[0] : query.type) : null,
      query.type ? (Array.isArray(query.type) ? query.type[0] : query.type) : null,
      query.query ? `%${query.query.toLowerCase()}%` : null,
      query.query ? `%${query.query.toLowerCase()}%` : null,
      query.importance || null,
      query.importance || null,
      query.timeRange?.start || null,
      query.timeRange?.start || null,
      query.timeRange?.end || null,
      query.timeRange?.end || null,
      query.includeExpired ? 0 : 1,
      now,
      query.limit || 100
    ) as any[]

    return rows.map((row) => this.rowToMemoryEntry(row))
  }

  /**
   * Delete a memory
   */
  deleteMemory(id: string): boolean {
    const result = this.deleteMemoryStmt.run(id)
    return result.changes > 0
  }

  // ============================================================================
  // Entity Operations
  // ============================================================================

  /**
   * Store an entity
   */
  addEntity(entity: Omit<Entity, 'id'>): string {
    const id = this.generateId('entity')
    const now = Date.now()

    this.insertEntityStmt.run(
      id,
      entity.name,
      entity.type,
      entity.attributes ? JSON.stringify(entity.attributes) : null,
      now,
      now,
      entity.confidence || 1.0
    )

    return id
  }

  /**
   * Get an entity by ID
   */
  getEntity(id: string): Entity | null {
    const row = this.getEntityStmt.get(id) as any
    return row ? this.rowToEntity(row) : null
  }

  /**
   * Find entity by name
   */
  findEntityByName(name: string): Entity | null {
    const row = this.findEntityByNameStmt.get(name) as any
    return row ? this.rowToEntity(row) : null
  }

  /**
   * Update entity
   */
  updateEntity(id: string, updates: Partial<Entity>): boolean {
    const existing = this.getEntity(id)
    if (!existing) return false

    const updated = { ...existing, ...updates }
    const result = this.updateEntityStmt.run(
      updated.name,
      updated.type,
      updated.attributes ? JSON.stringify(updated.attributes) : null,
      Date.now(),
      updated.mentionCount || existing.mentionCount,
      updated.confidence || existing.confidence,
      id
    )

    return result.changes > 0
  }

  /**
   * Search entities
   */
  searchEntities(query: string, limit = 10): Entity[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entities
      WHERE LOWER(name) LIKE LOWER(?)
         OR LOWER(attributes) LIKE LOWER(?)
      LIMIT ?
    `)

    const searchPattern = `%${query.toLowerCase()}%`
    const rows = stmt.all(searchPattern, searchPattern, limit) as any[]
    return rows.map((row) => this.rowToEntity(row))
  }

  /**
   * Get all entities of a type
   */
  getEntitiesByType(type: Entity['type'], limit?: number): Entity[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entities WHERE type = ? ORDER BY mention_count DESC LIMIT ?
    `)

    const rows = stmt.all(type, limit || -1) as any[]
    return rows.map((row) => this.rowToEntity(row))
  }

  // ============================================================================
  // Episode Operations
  // ============================================================================

  /**
   * Store an episode
   */
  addEpisode(episode: Omit<Episode, 'id'>): string {
    const id = this.generateId('episode')

    this.insertEpisodeStmt.run(
      id,
      episode.title,
      episode.summary,
      JSON.stringify(episode.messages),
      episode.startTime,
      episode.endTime,
      episode.participants ? JSON.stringify(episode.participants) : null,
      episode.entities ? JSON.stringify(episode.entities) : null,
      episode.tags ? JSON.stringify(episode.tags) : null,
      episode.importance || 2
    )

    return id
  }

  /**
   * Get an episode by ID
   */
  getEpisode(id: string): Episode | null {
    const row = this.getEpisodeStmt.get(id) as any
    return row ? this.rowToEpisode(row) : null
  }

  /**
   * Search episodes
   */
  searchEpisodes(query: string, limit = 10): Episode[] {
    const stmt = this.db.prepare(`
      SELECT * FROM episodes
      WHERE LOWER(title) LIKE LOWER(?)
         OR LOWER(summary) LIKE LOWER(?)
         OR LOWER(tags) LIKE LOWER(?)
      ORDER BY end_time DESC
      LIMIT ?
    `)

    const searchPattern = `%${query.toLowerCase()}%`
    const rows = stmt.all(searchPattern, searchPattern, searchPattern, limit) as any[]
    return rows.map((row) => this.rowToEpisode(row))
  }

  /**
   * Get recent episodes
   */
  getRecentEpisodes(limit = 10): Episode[] {
    const stmt = this.db.prepare(`
      SELECT * FROM episodes ORDER BY end_time DESC LIMIT ?
    `)

    const rows = stmt.all(limit) as any[]
    return rows.map((row) => this.rowToEpisode(row))
  }

  // ============================================================================
  // Statistics and Maintenance
  // ============================================================================

  /**
   * Get statistics
   */
  getStats(): MemoryStats['longTerm'] {
    const memoryCount = this.db.prepare('SELECT COUNT(*) as count FROM memories').get() as {
      count: number
    }
    const entityCount = this.db.prepare('SELECT COUNT(*) as count FROM entities').get() as {
      count: number
    }
    const episodeCount = this.db.prepare('SELECT COUNT(*) as count FROM episodes').get() as {
      count: number
    }

    // Calculate DB size (approximate)
    const dbSizeStmt = this.db.prepare(`
      SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()
    `)
    const dbSize = dbSizeStmt.get() as { size: number }

    return {
      memories: memoryCount.count,
      entities: entityCount.count,
      episodes: episodeCount.count,
      dbSizeMB: Math.round((dbSize.size / (1024 * 1024)) * 100) / 100,
    }
  }

  /**
   * Clean up expired memories
   */
  cleanup(): number {
    const stmt = this.db.prepare('DELETE FROM memories WHERE expires_at < ?')
    const result = stmt.run(Date.now())
    return result.changes
  }

  /**
   * Clear all data (dangerous!)
   */
  clearAll(): void {
    this.db.exec('DELETE FROM memories')
    this.db.exec('DELETE FROM entities')
    this.db.exec('DELETE FROM episodes')
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateId(prefix: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `${prefix}-${timestamp}-${random}`
  }

  private rowToMemoryEntry(row: any): MemoryEntry {
    return {
      id: row.id,
      type: row.type as MemoryType,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      importance: row.importance,
      timestamp: row.timestamp,
      expiresAt: row.expires_at || undefined,
      accessCount: row.access_count,
      lastAccessedAt: row.last_accessed_at || undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    }
  }

  private rowToEntity(row: any): Entity {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      attributes: row.attributes ? JSON.parse(row.attributes) : undefined,
      firstMentioned: row.first_mentioned,
      lastMentioned: row.last_mentioned,
      mentionCount: row.mention_count,
      confidence: row.confidence,
    }
  }

  private rowToEpisode(row: any): Episode {
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      messages: JSON.parse(row.messages),
      startTime: row.start_time,
      endTime: row.end_time,
      participants: row.participants ? JSON.parse(row.participants) : undefined,
      entities: row.entities ? JSON.parse(row.entities) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      importance: row.importance,
    }
  }
}
