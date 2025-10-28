/**
 * Web Search Tool - Example Result Parsing
 *
 * Demonstrates:
 * - Structured search result parsing
 * - Ranking and filtering results
 * - Snippet extraction and formatting
 * - Integration with external search APIs
 *
 * @module tools/examples/search
 */

import type { ToolDefinition } from '../interface.js'

/**
 * Search result structure
 */
interface SearchResult {
  title: string
  url: string
  snippet: string
  relevance_score: number
}

/**
 * Perform web search
 *
 * NOTE: This is a mock implementation for demonstration.
 * In production, integrate with actual search API (Google Custom Search, Bing, SerpAPI, etc.)
 */
async function performSearch(query: string, max_results: number): Promise<SearchResult[]> {
  // Mock implementation - replace with actual search API
  // Example: const response = await fetch(`https://api.search.com/v1/search?q=${encodeURIComponent(query)}&limit=${max_results}`);

  // Mock data
  const mockResults: SearchResult[] = [
    {
      title: `Understanding ${query} - Comprehensive Guide`,
      url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Learn everything about ${query} including best practices, common patterns, and real-world examples...`,
      relevance_score: 0.95,
    },
    {
      title: `${query} Tutorial for Beginners`,
      url: `https://tutorial.example.com/${query.toLowerCase()}`,
      snippet: `Step-by-step tutorial covering the fundamentals of ${query} with hands-on exercises...`,
      relevance_score: 0.87,
    },
    {
      title: `Top 10 ${query} Tools and Resources`,
      url: `https://tools.example.com/${query.toLowerCase()}-resources`,
      snippet: `Curated list of the best tools, libraries, and resources for ${query}...`,
      relevance_score: 0.79,
    },
  ]

  return mockResults.slice(0, max_results)
}

/**
 * Web search tool definition
 *
 * Allows LLM to search the web for information
 */
export const searchTool: ToolDefinition = {
  name: 'web_search',
  description:
    'Search the web for information. Returns a list of relevant results with titles, URLs, and snippets. Use this when you need current information or specific facts not in your training data.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query. Be specific and use keywords for best results.',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (1-10, default: 5)',
      },
    },
    required: ['query'],
  },
  handler: async (args) => {
    try {
      const query = args.query as string
      const maxResults = Math.min(Math.max((args.max_results as number) || 5, 1), 10)

      const results = await performSearch(query, maxResults)

      // Format results for LLM
      const formattedResults = results.map((result, index) => ({
        rank: index + 1,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        relevance: result.relevance_score,
      }))

      return JSON.stringify({
        query,
        results_count: formattedResults.length,
        results: formattedResults,
      })
    } catch (error) {
      return JSON.stringify({
        error: 'Search failed',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  },
}

/**
 * Example usage:
 *
 * const messages = [
 *   { role: 'user', content: 'What are the latest developments in AI agents?' }
 * ];
 *
 * const result = await toolEnabledChat(
 *   { messages, tools: [searchTool] },
 *   chatFn
 * );
 *
 * // LLM will:
 * // 1. Recognize need for current information
 * // 2. Call web_search with query="latest AI agent developments"
 * // 3. Receive search results with URLs and snippets
 * // 4. Synthesize information: "Recent developments include..."
 */
