import getOllamaClient from './ollama-adapter.js'

/**
 * Adapter-based Ollama native shim for triage
 * Avoids importing the real `ollama` package at compile time and
 * normalizes varying runtime shapes.
 */
export async function chatOllamaStructured(opts?: any): Promise<any> {
  const client: any = getOllamaClient()
  try {
    if (client.chat?.completions) return await client.chat.completions.create(opts)
    if (typeof client.chat === 'function') return await client.chat(opts)
    if (typeof client.pull === 'function') return await client.pull(opts)
  } catch (_e) {
    // fall through
  }
  return { choices: [] }
}

export async function listOllamaModels(): Promise<any> {
  const client: any = getOllamaClient()
  try {
    return (client.list && (await client.list())) || { models: [] }
  } catch (_e) {
    return { models: [] }
  }
}

export async function showOllama(model: string): Promise<any> {
  const client: any = getOllamaClient()
  try {
    return (client.show && (await client.show({ model }))) || null
  } catch (_e) {
    return null
  }
}

export async function deleteOllama(model: string): Promise<any> {
  const client: any = getOllamaClient()
  try {
    return (client.delete && (await client.delete({ model }))) || null
  } catch (_e) {
    return null
  }
}

export async function checkHealth(): Promise<{ healthy: boolean; models: number }> {
  try {
    const res = await listOllamaModels()
    return { healthy: true, models: res?.models?.length || 0 }
  } catch (_e) {
    return { healthy: false, models: 0 }
  }
}

// Default export removed to avoid ambient default collisions during triage.

// --- Embeddings shim ---
// Overloads: single input -> single vector, array input -> batch of vectors
export function embedOllama(input: string, _model?: string): Promise<number[]>
export function embedOllama(input: string[], _model?: string): Promise<number[][]>
export async function embedOllama(
  input: string | string[],
  _model?: string
): Promise<number[] | number[][]> {
  const client: any = getOllamaClient()
  try {
    const payload = Array.isArray(input) ? input : [input]
    if (client.embeddings?.create) {
      const resp = await client.embeddings.create({ input: payload })
      const vectors = resp.data?.map((d: any) => d.embedding) || []
      return Array.isArray(input) ? vectors : vectors[0] || []
    }
    if (client.embed) {
      // older shapes
      const resp = await client.embed({ input: payload })
      const vectors = resp.data?.map((d: any) => d.embedding) || []
      return Array.isArray(input) ? vectors : vectors[0] || []
    }
  } catch (_e) {
    // fallthrough
  }
  return Array.isArray(input) ? [] : []
}

export async function embedOllamaBatch(inputs: string[], _model?: string): Promise<number[][]> {
  const res = await embedOllama(inputs)
  return (
    Array.isArray(res) && Array.isArray(res[0]) ? (res as any) : inputs.map(() => [])
  ) as number[][]
}

// --- Tools / specialized chat shim used by examples ---
export async function chatOllamaTools(opts?: any): Promise<any> {
  const client: any = getOllamaClient()
  try {
    if (client.tools?.run) return await client.tools.run(opts)
    if (client.chat?.completions) return await client.chat.completions.create(opts)
  } catch (_e) {
    // fallthrough
  }
  return { choices: [] }
}
