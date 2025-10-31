// Minimal litellm proxy shim used by the codebase during triage.
// Exposes a permissive `litellm` object with `embeddings` and `chat` helpers.
// During triage we provide a compact, single-source `litellm` surface
// that delegates to the runtime OpenAI adapter. This avoids duplicate
// declarations and SDK-shape drift while keeping a predictable API.
import createOpenAIClient from './openai-adapter.js'

export const litellm = {
  createClient: (opts?: any) => createOpenAIClient(opts),
  async embeddings(opts?: any) {
    const client: any = createOpenAIClient(opts)
    try {
      // Support multiple shapes; prefer `embeddings.create` then fallback
      return (
        (client.embeddings && (await client.embeddings.create?.(opts))) ||
        (client.embeddings && (await client.embeddings(opts))) || { data: [] }
      )
    } catch (_e) {
      return { data: [] }
    }
  },
  // `chat` is implemented as a callable function but also exposes a
  // `.completions.create` shape to satisfy callsites that expect the
  // OpenAI-style client object. Functions are objects in JS, so we attach
  // a `.completions.create` helper that delegates to the same implementation.
  chat: (() => {}) as any,
  // Minimal models surface for the triage pass
  async modelsList(opts?: any) {
    const client: any = createOpenAIClient(opts)
    try {
      return (client.models && (await client.models.list?.(opts))) || { data: [] }
    } catch (_e) {
      return { data: [] }
    }
  },
}

// Note: default export removed to avoid duplicate ambient/default
// declaration collisions with local shims during the triage pass.

// Attach a callable implementation for `chat` and provide a
// `.completions.create` surface so both `litellm.chat(opts)` and
// `litellm.chat.completions.create(opts)` work for callers.
async function _chatImplImpl(opts?: any) {
  const client: any = createOpenAIClient(opts)
  try {
    // Prefer the `chat.completions.create` shaped API, then fall back
    return (
      (client.chat?.completions && (await client.chat.completions.create?.(opts))) ||
      (client.chat && (await client.chat(opts))) || { choices: [] }
    )
  } catch (_e) {
    return { choices: [] }
  }
}

const _chatImpl: any = (opts?: any) => _chatImplImpl(opts)
_chatImpl.completions = { create: (opts: any) => _chatImplImpl(opts) }
litellm.chat = _chatImpl

// --- Convenience named exports used by other modules (triage adapters) ---
export async function chatLiteLLM(messages: any[], _preferences: any = {}, options: any = {}) {
  return await litellm.chat({ ...options, messages })
}

export async function chatLiteLLMSync(messages: any[], _preferences: any = {}, options: any = {}) {
  // Ensure non-streaming
  return await litellm.chat({ ...options, messages, stream: false })
}

export async function embedLiteLLM(text: string | string[], _preferences: any = {}) {
  const input = Array.isArray(text) ? text : [text]
  const resp = await litellm.embeddings({ input, ..._preferences })
  const embeddings = resp?.data?.map((i: any) => i.embedding) || []
  return Array.isArray(text) ? embeddings : embeddings[0]
}

export async function listProxyModels() {
  const resp = await litellm.modelsList()
  return resp?.data?.map((m: any) => m.id) || []
}

export async function checkProxyHealth(): Promise<{
  healthy: boolean
  version?: string
  models?: number
}> {
  try {
    const baseURL = process.env.LITELLM_URL || 'http://localhost:4000'
    const response = await fetch(`${baseURL}/health`)
    if (!response.ok) return { healthy: false }
    const data = await response.json()
    const d: any = data as any
    return { healthy: true, version: d.version, models: d.models?.length }
  } catch (_err) {
    return { healthy: false }
  }
}
