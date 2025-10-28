/**
 * Unified Tool Calling Interface
 *
 * Provides a provider-agnostic interface for tool/function calling across
 * Ollama, OpenAI, DeepSeek, and Gemini via LiteLLM proxy.
 *
 * @module tools/interface
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { LLMProvider } from '../types'

/**
 * Tool/function parameter schema using JSON Schema
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  enum?: string[] | number[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
  required?: string[]
}

/**
 * Tool/function definition
 */
export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required?: string[]
  }
  handler: (args: Record<string, unknown>) => Promise<string> | string
}

/**
 * Tool call made by the LLM
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  tool_call_id: string
  role: 'tool'
  name: string
  content: string
}

/**
 * Request for tool-enabled chat completion
 */
export interface ToolChatRequest {
  messages: ChatCompletionMessageParam[]
  tools: ToolDefinition[]
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

/**
 * Response from tool-enabled chat completion
 */
export interface ToolChatResponse {
  content: string | null
  tool_calls?: ToolCall[]
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter'
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Convert ToolDefinition to OpenAI function format
 */
export function toOpenAIFunction(tool: ToolDefinition) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }
}

/**
 * Convert ToolDefinition to Ollama tool format
 */
export function toOllamaTool(tool: ToolDefinition) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }
}

/**
 * Validate tool arguments against schema
 */
export function validateToolArgs(
  args: Record<string, unknown>,
  schema: ToolDefinition['parameters']
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = []

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in args)) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  // Type validation
  for (const [key, value] of Object.entries(args)) {
    const paramSchema = schema.properties[key]
    if (!paramSchema) {
      errors.push(`Unknown parameter: ${key}`)
      continue
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value
    if (actualType !== paramSchema.type) {
      errors.push(`Invalid type for ${key}: expected ${paramSchema.type}, got ${actualType}`)
    }

    // Enum validation
    if (paramSchema.enum && !paramSchema.enum.includes(value as string | number)) {
      errors.push(`Invalid value for ${key}: must be one of ${paramSchema.enum.join(', ')}`)
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}

/**
 * Execute tool calls and return results
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  toolDefinitions: ToolDefinition[]
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = []

  for (const call of toolCalls) {
    try {
      // Find tool definition
      const tool = toolDefinitions.find((t) => t.name === call.function.name)
      if (!tool) {
        results.push({
          tool_call_id: call.id,
          role: 'tool',
          name: call.function.name,
          content: JSON.stringify({
            error: `Unknown tool: ${call.function.name}`,
          }),
        })
        continue
      }

      // Parse arguments
      let args: Record<string, unknown>
      try {
        args = JSON.parse(call.function.arguments)
      } catch (e) {
        results.push({
          tool_call_id: call.id,
          role: 'tool',
          name: call.function.name,
          content: JSON.stringify({
            error: 'Invalid JSON arguments',
            details: e instanceof Error ? e.message : String(e),
          }),
        })
        continue
      }

      // Validate arguments
      const validation = validateToolArgs(args, tool.parameters)
      if (!validation.valid) {
        results.push({
          tool_call_id: call.id,
          role: 'tool',
          name: call.function.name,
          content: JSON.stringify({
            error: 'Invalid arguments',
            details: validation.errors,
          }),
        })
        continue
      }

      // Execute tool
      const result = await tool.handler(args)
      results.push({
        tool_call_id: call.id,
        role: 'tool',
        name: call.function.name,
        content: result,
      })
    } catch (e) {
      results.push({
        tool_call_id: call.id,
        role: 'tool',
        name: call.function.name,
        content: JSON.stringify({
          error: 'Tool execution failed',
          details: e instanceof Error ? e.message : String(e),
        }),
      })
    }
  }

  return results
}

/**
 * Tool-enabled chat completion with automatic multi-turn handling
 *
 * Automatically handles tool calls in a loop:
 * 1. Send messages to LLM
 * 2. If tool calls requested, execute them
 * 3. Send tool results back to LLM
 * 4. Repeat until LLM returns final answer
 *
 * @param request - Chat request with tools
 * @param chatFn - Provider-specific chat function
 * @param maxIterations - Maximum tool call iterations (default: 5)
 */
export async function toolEnabledChat(
  request: ToolChatRequest,
  chatFn: (messages: ChatCompletionMessageParam[], tools: unknown[]) => Promise<ToolChatResponse>,
  maxIterations = 5
): Promise<{ content: string; iterations: number; tool_calls_made: string[] }> {
  const messages = [...request.messages]
  const tools = request.tools.map(toOpenAIFunction)
  const toolCallsMade: string[] = []
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    // Call LLM
    const response = await chatFn(messages, tools)

    // If no tool calls, we're done
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return {
        content: response.content || '',
        iterations,
        tool_calls_made: toolCallsMade,
      }
    }

    // Execute tool calls
    const results = await executeToolCalls(response.tool_calls, request.tools)

    // Track tool calls
    for (const call of response.tool_calls) {
      toolCallsMade.push(call.function.name)
    }

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: response.content,
      tool_calls: response.tool_calls,
    })

    // Add tool results
    for (const result of results) {
      messages.push(result as ChatCompletionMessageParam)
    }
  }

  throw new Error(
    `Max tool call iterations (${maxIterations}) reached. Tool calls made: ${toolCallsMade.join(', ')}`
  )
}
