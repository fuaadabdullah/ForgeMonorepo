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

// Example tools
export { weatherTool } from './examples/weather.js'
export { searchTool } from './examples/search.js'
export { memoryTool } from './examples/memory.js'

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
