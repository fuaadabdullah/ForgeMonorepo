import { type GuildMemberReference, GuildRegistryError, loadRegistrySync } from '@goblinos/registry'
import type { LiteBrainConfig } from './base.js'

const ROUTER_MODEL_MAP: Record<string, string> = {
  'deepseek-r1': 'deepseek-r1',
  openai: 'gpt-4-turbo',
  gemini: 'gemini-pro',
}

const DEFAULT_PROVIDER_URL = process.env.LITELLM_BASE_URL || 'http://litellm:4000'
const DEFAULT_API_KEY = process.env.LITELLM_API_KEY || 'dummy'

const registry = loadRegistrySync()

export function resolveGuildMember(memberId: string): GuildMemberReference {
  const member = registry.memberMap.get(memberId)
  if (!member) {
    throw new GuildRegistryError(`Unknown guild member: ${memberId}`)
  }
  return member
}

export function getMemberLiteBrainConfig(memberId: string): LiteBrainConfig {
  const member = resolveGuildMember(memberId)
  return buildConfigFromMember(member)
}

function buildConfigFromMember(member: GuildMemberReference): LiteBrainConfig {
  const litebrain = member.litebrain
  const localModels = litebrain.local ?? []
  const defaultModel = localModels[0] ?? mapRouterToModel(litebrain.routers?.[0]) ?? 'ollama'

  const fallbackModels: string[] = []
  if (localModels.length > 1) {
    fallbackModels.push(...localModels.slice(1))
  }
  if (litebrain.routers) {
    for (const router of litebrain.routers) {
      const mapped = mapRouterToModel(router)
      if (mapped && mapped !== defaultModel) {
        fallbackModels.push(mapped)
      }
    }
  }
  const embeddingModel = Array.isArray(litebrain.embeddings)
    ? litebrain.embeddings[0]
    : litebrain.embeddings

  return {
    memberId: member.id,
    name: `${member.title ?? member.name} LiteBrain`,
    defaultModel,
    fallbackModels,
    providerBaseURL: DEFAULT_PROVIDER_URL,
    apiKey: DEFAULT_API_KEY,
    temperature: litebrain.temperature ?? 0.2,
    maxTokens: litebrain.max_tokens ?? 2048,
    timeout: litebrain.timeout ?? 30000,
    embeddingModel,
    analyticsTag: litebrain.analytics_tag,
  }
}

function mapRouterToModel(router?: string) {
  if (!router) return undefined
  return ROUTER_MODEL_MAP[router] ?? router
}

export function getRegistry() {
  return registry
}
