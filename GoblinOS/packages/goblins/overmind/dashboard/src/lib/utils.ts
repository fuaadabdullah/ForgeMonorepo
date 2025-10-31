import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

/**
 * Fuzzy search implementation that finds matches and returns highlighted text
 */
export function fuzzySearch(
  text: string,
  query: string
): { match: boolean; highlighted: string; score: number } {
  if (!query.trim()) {
    return { match: true, highlighted: text, score: 0 }
  }

  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    const index = textLower.indexOf(queryLower)
    const before = text.slice(0, index)
    const match = text.slice(index, index + query.length)
    const after = text.slice(index + query.length)
    return {
      match: true,
      highlighted: `${before}<mark>${match}</mark>${after}`,
      score: 100 - index, // Prefer matches closer to start
    }
  }

  // Fuzzy match - check if all query characters appear in order
  let textIndex = 0
  let queryIndex = 0
  let score = 0
  const highlights: Array<{ start: number; end: number }> = []

  while (textIndex < textLower.length && queryIndex < queryLower.length) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      highlights.push({ start: textIndex, end: textIndex + 1 })
      queryIndex++
      score += 10 // Base match score
      // Bonus for consecutive matches
      if (highlights.length > 1 && highlights[highlights.length - 2].end === textIndex) {
        score += 5
      }
    }
    textIndex++
  }

  if (queryIndex === queryLower.length) {
    // Build highlighted string
    let result = ''
    let lastEnd = 0

    for (const highlight of highlights) {
      result += text.slice(lastEnd, highlight.start)
      result += `<mark>${text.slice(highlight.start, highlight.end)}</mark>`
      lastEnd = highlight.end
    }
    result += text.slice(lastEnd)

    return {
      match: true,
      highlighted: result,
      score: score - (text.length - query.length), // Prefer shorter matches
    }
  }

  return { match: false, highlighted: text, score: 0 }
}

/**
 * Sort search results by relevance score
 */
export function sortSearchResults<T extends { score: number }>(results: T[]): T[] {
  return results.sort((a, b) => b.score - a.score)
}
