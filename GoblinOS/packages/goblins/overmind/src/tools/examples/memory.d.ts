import type { ToolDefinition } from '../interface.js'

export interface MemoryEntry {
  id: string
  content: string
  timestamp: number
  importance: number
  tier: 'short-term' | 'working' | 'long-term'
  tags?: string[]
}

export const memoryTool: ToolDefinition
