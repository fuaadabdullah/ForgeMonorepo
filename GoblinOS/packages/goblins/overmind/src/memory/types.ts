/**
 * 🧠 Memory System Types
 *
 * Defines types for Overmind's hybrid memory architecture:
 * - Short-term: Recent conversation context (last N messages)
 * - Working: Active task context and temporary facts
 * - Long-term: Persistent facts, entities, and episodic memories
 * - Vector: Semantic search over historical conversations
 */

import { z } from 'zod'
import type { Message } from '../types.js'

// ============================================================================
// Memory Entry Types
// ============================================================================

export enum MemoryType {
  SHORT_TERM = 'short-term',
  WORKING = 'working',
  LONG_TERM = 'long-term',
  EPISODIC = 'episodic',
  ENTITY = 'entity',
}

export enum MemoryImportance {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export const MemoryEntrySchema = z.object({
  id: z.string(),
  type: z.nativeEnum(MemoryType),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  importance: z.nativeEnum(MemoryImportance),
  timestamp: z.number(),
  expiresAt: z.number().optional(),
  accessCount: z.number().default(0),
  lastAccessedAt: z.number().optional(),
  embedding: z.array(z.number()).optional(), // Vector embedding for semantic search
})

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>

// ============================================================================
// Entity Memory Types
// ============================================================================

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['person', 'organization', 'location', 'concept', 'tool', 'other']),
  attributes: z.record(z.unknown()),
  firstMentioned: z.number(),
  lastMentioned: z.number(),
  mentionCount: z.number().default(1),
  confidence: z.number().min(0).max(1), // How confident are we this is a real entity
  relatedEntities: z.array(z.string()).optional(), // IDs of related entities
})

export type Entity = z.infer<typeof EntitySchema>

// ============================================================================
// Episodic Memory Types
// ============================================================================

export const EpisodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  messages: z.array(z.unknown()), // Array of Message objects
  startTime: z.number(),
  endTime: z.number(),
  participants: z.array(z.string()), // Agent/user IDs
  entities: z.array(z.string()), // Entity IDs mentioned
  tags: z.array(z.string()).optional(),
  outcome: z.string().optional(),
  importance: z.nativeEnum(MemoryImportance),
  embedding: z.array(z.number()).optional(),
})

export type Episode = z.infer<typeof EpisodeSchema>

// ============================================================================
// Memory Store Configuration
// ============================================================================

export const MemoryConfigSchema = z
  .object({
    // Short-term memory config
    shortTerm: z
      .object({
        maxMessages: z.number().default(20),
        ttlSeconds: z.number().default(3600), // 1 hour
      })
      .default({}),

    // Working memory config
    working: z
      .object({
        maxEntries: z.number().default(50),
        ttlSeconds: z.number().default(7200), // 2 hours
      })
      .default({}),

    // Long-term memory config
    longTerm: z
      .object({
        enabled: z.boolean().default(true),
        dbPath: z.string().default('./data/memory.db'),
        vectorDbPath: z.string().default('./data/vectors'),
        vectorDimensions: z.number().default(1536), // OpenAI ada-002 dimension
      })
      .default({}),

    // Entity extraction config
    entities: z
      .object({
        enabled: z.boolean().default(true),
        minConfidence: z.number().min(0).max(1).default(0.7),
        maxEntities: z.number().default(1000),
      })
      .default({}),

    // Episodic memory config
    episodes: z
      .object({
        enabled: z.boolean().default(true),
        autoSummarize: z.boolean().default(true),
        minMessagesPerEpisode: z.number().default(5),
        maxEpisodes: z.number().default(100),
      })
      .default({}),

    // Vector search config
    vectorSearch: z
      .object({
        enabled: z.boolean().default(false), // Requires embedding API
        embeddingProvider: z.enum(['openai', 'local']).default('openai'),
        embeddingModel: z.string().default('text-embedding-ada-002'),
        topK: z.number().default(5),
        minSimilarity: z.number().min(0).max(1).default(0.7),
      })
      .default({}),
  })
  .default({})

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>

// ============================================================================
// Memory Query Types
// ============================================================================

export interface MemoryQuery {
  type?: MemoryType | MemoryType[]
  query?: string // Text query for semantic search
  entityId?: string
  episodeId?: string
  importance?: MemoryImportance
  timeRange?: {
    start: number
    end: number
  }
  limit?: number
  includeExpired?: boolean
}

export interface MemorySearchResult {
  entry: MemoryEntry | Entity | Episode
  score: number // Relevance score (0-1)
  source: 'exact' | 'semantic' | 'entity' | 'episodic'
}

// ============================================================================
// Memory Statistics
// ============================================================================

export interface MemoryStats {
  shortTerm: {
    count: number
    oldestTimestamp: number | null
    newestTimestamp: number | null
  }
  working: {
    count: number
    capacity: number
    utilizationPercent: number
  }
  longTerm: {
    memories: number
    entities: number
    episodes: number
    dbSizeMB: number
  }
  vectorStore: {
    enabled: boolean
    indexedEntries: number
    dimensionality: number
  }
}

// ============================================================================
// Memory Events (for observability)
// ============================================================================

export type MemoryEvent =
  | { type: 'memory.added'; memoryType: MemoryType; entryId: string }
  | { type: 'memory.accessed'; memoryType: MemoryType; entryId: string }
  | { type: 'memory.expired'; memoryType: MemoryType; entryId: string; count: number }
  | { type: 'entity.extracted'; entityId: string; name: string; confidence: number }
  | { type: 'episode.created'; episodeId: string; messageCount: number }
  | { type: 'vector.indexed'; entryId: string; dimensions: number }
  | { type: 'search.executed'; query: string; resultCount: number; durationMs: number }
