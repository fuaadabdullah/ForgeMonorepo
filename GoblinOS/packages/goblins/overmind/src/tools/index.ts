/**
 * Tools Module - Unified Tool Calling System
 *
 * Exports:
 * - Core interfaces and utilities (interface.ts)
 * - Example tool implementations (weather, search, memory)
 * - Integration helpers for all LLM providers
 *
 * @module tools
 */

// Core interfaces
export {
  type ToolParameter,
  type ToolDefinition,
  type ToolCall,
  type ToolCallResult,
  type ToolChatRequest,
  type ToolChatResponse,
  toOpenAIFunction,
  toOllamaTool,
  validateToolArgs,
  executeToolCalls,
  toolEnabledChat,
} from './interface.js'

import { memoryTool } from './examples/memory.js'
import { searchTool } from './examples/search.js'
// Example tools
import { weatherTool } from './examples/weather.js'

export { weatherTool, searchTool, memoryTool }

/**
 * All available tools registry
 */
export const ALL_TOOLS = {
  weather: weatherTool,
  search: searchTool,
  memory: memoryTool,
} as const

/**
 * Get tools by category
 */
export function getToolsByCategory(category: 'external' | 'internal' | 'all') {
  switch (category) {
    case 'external':
      return [weatherTool, searchTool]
    case 'internal':
      return [memoryTool]
    case 'all':
      return [weatherTool, searchTool, memoryTool]
    default:
      return []
  }
}
