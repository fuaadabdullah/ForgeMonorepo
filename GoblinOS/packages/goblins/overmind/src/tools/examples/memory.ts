/**
 * Memory Retrieval Tool - Internal System Integration
 *
 * Demonstrates:
 * - Integration with Overmind's memory system
 * - Searching across memory tiers (short-term, working, long-term)
 * - Importance-based filtering
 * - Context injection for LLM
 *
 * @module tools/examples/memory
 */

import type { ToolDefinition } from '../interface.js'

/**
 * Memory entry structure
 */
interface MemoryEntry {
  id: string
  content: string
  timestamp: number
  importance: number
  tier: 'short-term' | 'working' | 'long-term'
  tags?: string[]
}

/**
 * Search memory across all tiers
 *
 * NOTE: This is a simplified implementation for demonstration.
 * In production, integrate with actual memory manager from Overmind Phase 2.
 */
async function searchMemory(
  query: string,
  min_importance: number,
  max_results: number
): Promise<MemoryEntry[]> {
  // Mock implementation - replace with actual memory system integration
  // Example: import { memoryManager } from '../memory';
  // const results = await memoryManager.search(query, { minImportance, limit: maxResults });

  // Mock data
  const mockMemories: MemoryEntry[] = [
    {
      id: 'mem-001',
      content: `User prefers ${query}-related information with detailed explanations`,
      timestamp: Date.now() - 3600000,
      importance: 0.9,
      tier: 'working',
      tags: ['preference', 'user-context'],
    },
    {
      id: 'mem-002',
      content: `Previous conversation about ${query} covered advanced topics`,
      timestamp: Date.now() - 7200000,
      importance: 0.75,
      tier: 'working',
      tags: ['conversation-history', query.toLowerCase()],
    },
    {
      id: 'mem-003',
      content: `User asked for ${query} examples in past sessions`,
      timestamp: Date.now() - 86400000,
      importance: 0.6,
      tier: 'long-term',
      tags: ['user-behavior', 'examples'],
    },
  ]

  // Filter by importance and limit
  return mockMemories
    .filter((m) => m.importance >= min_importance)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, max_results)
}

/**
 * Memory retrieval tool definition
 *
 * Allows LLM to search its own memory system for relevant context
 */
export const memoryTool: ToolDefinition = {
  name: 'retrieve_memory',
  description:
    'Search the memory system for relevant past conversations, user preferences, and context. Use this to maintain coherent long-term interactions and personalize responses.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'What to search for in memory (e.g., "user preferences", "previous discussion about X")',
      },
      min_importance: {
        type: 'number',
        description:
          'Minimum importance threshold (0.0-1.0). Higher values return only critical memories. Default: 0.5',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of memory entries to return (1-20, default: 5)',
      },
    },
    required: ['query'],
  },
  handler: async (args) => {
    try {
      const query = args.query as string
      const minImportance = Math.max(Math.min((args.min_importance as number) || 0.5, 1.0), 0.0)
      const maxResults = Math.min(Math.max((args.max_results as number) || 5, 1), 20)

      const memories = await searchMemory(query, minImportance, maxResults)

      // Format for LLM consumption
      const formattedMemories = memories.map((mem) => ({
        id: mem.id,
        content: mem.content,
        age_hours: Math.round((Date.now() - mem.timestamp) / 3600000),
        importance: mem.importance,
        tier: mem.tier,
        tags: mem.tags,
      }))

      return JSON.stringify({
        query,
        memories_found: formattedMemories.length,
        min_importance: minImportance,
        memories: formattedMemories,
      })
    } catch (error) {
      return JSON.stringify({
        error: 'Memory retrieval failed',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  },
}

/**
 * Example usage:
 *
 * const messages = [
 *   { role: 'user', content: 'Continue our discussion from yesterday about routing strategies' }
 * ];
 *
 * const result = await toolEnabledChat(
 *   { messages, tools: [memoryTool] },
 *   chatFn
 * );
 *
 * // LLM will:
 * // 1. Recognize need for context from past conversation
 * // 2. Call retrieve_memory with query="routing strategies discussion"
 * // 3. Receive relevant memory entries
 * // 4. Use context to continue discussion coherently
 */

/**
 * Integration pattern for Overmind Phase 2 memory system:
 *
 * import { memoryManager } from '../memory';
 *
 * async function searchMemory(query, minImportance, maxResults) {
 *   // Search short-term
 *   const shortTerm = await memoryManager.shortTerm.search(query);
 *
 *   // Search working memory
 *   const working = await memoryManager.working.search(query);
 *
 *   // Search long-term with semantic similarity
 *   const longTerm = await memoryManager.longTerm.search(query, {
 *     minSimilarity: 0.7,
 *     limit: maxResults
 *   });
 *
 *   // Combine and rank by importance
 *   const combined = [...shortTerm, ...working, ...longTerm]
 *     .filter(m => m.importance >= minImportance)
 *     .sort((a, b) => b.importance - a.importance)
 *     .slice(0, maxResults);
 *
 *   return combined;
 * }
 */
