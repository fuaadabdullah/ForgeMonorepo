import type { ToolDefinition } from '../interface.js'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  relevance_score: number
}

export const searchTool: ToolDefinition
