/**
 * Tool Calling Examples - Complete Usage Guide
 *
 * Demonstrates tool-enabled chat with all providers:
 * - Ollama (via native client - best tool support)
 * - LiteLLM Proxy (unified interface)
 * - OpenAI-compatible endpoint
 *
 * @module tools/examples
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { litellm } from '../clients/litellm-proxy.js'
import { chatOllamaTools } from '../clients/ollama-native.js'
import { memoryTool, searchTool, toolEnabledChat, weatherTool } from './index.js'
import type { ToolChatResponse } from './interface.js'

/**
 * Example 1: Weather query with Ollama native client
 *
 * Uses qwen2.5-coder:7b for strong tool-calling performance
 */
export async function weatherExample() {
  console.log('=== Weather Query Example (Ollama Native) ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: "What's the weather like in Tokyo? I'm planning a trip.",
    },
  ]

  try {
    const result = await toolEnabledChat(
      { messages, tools: [weatherTool] },
      async (msgs, tools) => {
        const response = await chatOllamaTools({
          messages: msgs,
          tools: tools.map((t) => t),
          model: 'qwen2.5-coder:7b',
          stream: false,
        })

        return {
          content: response.message.content,
          tool_calls: response.message.tool_calls,
          finish_reason: 'stop',
        } as ToolChatResponse
      }
    )

    console.log('Final Response:', result.content)
    console.log('Tool Calls Made:', result.tool_calls_made)
    console.log('Iterations:', result.iterations)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Example 2: Web search with LiteLLM proxy
 *
 * Uses smart routing to select best provider for search task
 */
export async function searchExample() {
  console.log('\n=== Web Search Example (LiteLLM Proxy) ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: 'Find recent information about advances in local LLM inference.',
    },
  ]

  try {
    const result = await toolEnabledChat({ messages, tools: [searchTool] }, async (msgs, tools) => {
      const response = await litellm.chat.completions.create({
        model: 'gpt-4o-mini', // Or use selectModel() for smart routing
        messages: msgs,
        tools,
      })

      const choice = response.choices[0]
      return {
        content: choice.message.content,
        tool_calls: choice.message.tool_calls as unknown as ToolChatResponse['tool_calls'],
        finish_reason: choice.finish_reason as ToolChatResponse['finish_reason'],
        usage: response.usage,
      }
    })

    console.log('Final Response:', result.content)
    console.log('Tool Calls Made:', result.tool_calls_made)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Example 3: Memory-aware conversation
 *
 * Combines multiple tools for context-aware responses
 */
export async function memoryAwareExample() {
  console.log('\n=== Memory-Aware Conversation (Multi-Tool) ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content:
        'Based on my previous preferences, what coding environment should I use for the weather in my location?',
    },
  ]

  try {
    const result = await toolEnabledChat(
      {
        messages,
        tools: [weatherTool, memoryTool], // Multiple tools available
      },
      async (msgs, tools) => {
        const response = await litellm.chat.completions.create({
          model: 'gemini-2.0-flash-exp', // Gemini excels at multi-tool coordination
          messages: msgs,
          tools,
        })

        const choice = response.choices[0]
        return {
          content: choice.message.content,
          tool_calls: choice.message.tool_calls as unknown as ToolChatResponse['tool_calls'],
          finish_reason: choice.finish_reason as ToolChatResponse['finish_reason'],
        }
      }
    )

    console.log('Final Response:', result.content)
    console.log('Tool Calls Made:', result.tool_calls_made)
    console.log('\nNote: LLM may call multiple tools in sequence:')
    console.log('  1. retrieve_memory - Check user preferences')
    console.log('  2. get_weather - Get current conditions')
    console.log('  3. Synthesize personalized recommendation')
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Example 4: Error handling and validation
 */
export async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: 'Search for "invalid query" with -10 results', // Invalid max_results
    },
  ]

  try {
    const result = await toolEnabledChat({ messages, tools: [searchTool] }, async (msgs, tools) => {
      const response = await litellm.chat.completions.create({
        model: 'deepseek-chat',
        messages: msgs,
        tools,
      })

      const choice = response.choices[0]
      return {
        content: choice.message.content,
        tool_calls: choice.message.tool_calls as unknown as ToolChatResponse['tool_calls'],
        finish_reason: choice.finish_reason as ToolChatResponse['finish_reason'],
      }
    })

    console.log('Final Response:', result.content)
    console.log('Note: Tool validation clamped max_results to valid range (1-10)')
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Example 5: Streaming with tool calls (Ollama native)
 */
export async function streamingToolExample() {
  console.log('\n=== Streaming Tool Calls (Ollama) ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: 'Get weather for Paris and explain why it matters for tourism.',
    },
  ]

  try {
    const response = await chatOllamaTools({
      messages,
      tools: [{ type: 'function', function: weatherTool }],
      model: 'qwen2.5-coder:7b',
      stream: true,
    })

    console.log('Streaming response received')

    // Note: In streaming mode, you'd process chunks as they arrive
    // This example shows the final aggregated message
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      console.log('Tool calls detected:', response.message.tool_calls.length)
      console.log('Tool:', response.message.tool_calls[0].function.name)
      console.log('Arguments:', response.message.tool_calls[0].function.arguments)
    }

    console.log('Content:', response.message.content)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  await weatherExample()
  await searchExample()
  await memoryAwareExample()
  await errorHandlingExample()
  await streamingToolExample()
}

// Uncomment to run when executing this file directly:
// runAllExamples().catch(console.error);
