import type {
  OllamaModel,
  ProvidersHealthResponse,
  PullModelRequest,
  PullModelResponse,
  RoutingStats,
} from './types'

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000'

export function getBaseUrl() {
  // In Vite, environment variables are accessed via import.meta.env
  return import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || res.statusText)
  }
  return res.json() as Promise<T>
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {}
  }

  if (localStorage.getItem('auth_mode') === 'dev') {
    return {}
  }

  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchProvidersHealth(): Promise<ProvidersHealthResponse> {
  const res = await fetch(`${getBaseUrl()}/providers/health`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<ProvidersHealthResponse>(res)
}

export async function fetchOllamaModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${getBaseUrl()}/ollama/models`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<OllamaModel[]>(res)
}

export async function pullOllamaModel(payload: PullModelRequest): Promise<PullModelResponse> {
  const res = await fetch(`${getBaseUrl()}/ollama/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<PullModelResponse>(res)
}

export async function fetchRoutingAnalytics(): Promise<RoutingStats> {
  const res = await fetch(`${getBaseUrl()}/v1/analytics`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<RoutingStats>(res)
}

// Guild litebrain validation
const GUILD_LITEBRAINS: Record<
  string,
  Record<string, { local: string[]; routers: string[]; embeddings?: string[] }>
> = {
  forge: {
    'dregg-embercode': {
      local: ['ollama'],
      routers: ['deepseek-r1'],
      embeddings: ['nomic-embed-text'],
    },
  },
  crafters: {
    'vanta-lumin': {
      local: ['ollama'],
      routers: ['deepseek-r1'],
    },
    'volt-furnace': {
      local: ['ollama-coder'],
      routers: ['deepseek-r1'],
    },
  },
  huntress: {
    'magnolia-nightbloom': {
      local: ['ollama-coder'],
      routers: ['openai'],
    },
    'mags-charietto': {
      local: ['ollama-coder'],
      routers: ['gemini'],
    },
  },
  keepers: {
    'sentenial-ledgerwarden': {
      local: ['ollama'],
      routers: ['deepseek-r1'],
      embeddings: ['nomic-embed-text'],
    },
  },
  mages: {
    'hex-oracle': {
      local: ['ollama'],
      routers: ['deepseek-r1'],
    },
    'grim-rune': {
      local: ['ollama-coder'],
      routers: ['deepseek-r1'],
    },
    'launcey-gauge': {
      local: ['ollama'],
      routers: ['deepseek-r1'],
    },
  },
}

function validateGuildLiteBrain(
  guild: string,
  goblinId: string,
  liteBrain: string
): { valid: boolean; error?: string } {
  const guildConfig = GUILD_LITEBRAINS[guild]
  if (!guildConfig) {
    return { valid: false, error: `Unknown guild: ${guild}` }
  }

  const goblinConfig = guildConfig[goblinId]
  if (!goblinConfig) {
    return { valid: false, error: `Unknown goblin: ${goblinId} in guild ${guild}` }
  }

  // Check if litebrain is allowed
  const allowedLocal = goblinConfig.local || []
  const allowedRouters = goblinConfig.routers || []
  const allowedEmbeddings = goblinConfig.embeddings || []

  const allAllowed = [...allowedLocal, ...allowedRouters, ...allowedEmbeddings]

  if (allAllowed.some((allowed) => liteBrain.toLowerCase().includes(allowed.toLowerCase()))) {
    return { valid: true }
  }

  return {
    valid: false,
    error: `Goblin ${goblinId} in guild ${guild} used unauthorized litebrain: ${liteBrain}. Allowed: ${allAllowed.join(', ')}`,
  }
}

export interface RouterAuditLog {
  sessionId: string
  guild: 'forge' | 'crafters' | 'keepers' | 'huntress' | 'mages'
  goblinId?: string
  task: string
  liteBrain: string
  routingReason: string
  timestamp: string
  escalationTrigger?: string
  fallbackChain: string[]
  kpi?: {
    buildTime?: number
    cls?: number
    securityScore?: number
    testCoverage?: number
    qualityScore?: number
  }
  success: boolean
  error?: string
}

export async function logRouterAudit(log: RouterAuditLog): Promise<{ success: boolean }> {
  // Validate guild litebrain compliance if goblinId is provided
  if (log.goblinId) {
    const validation = validateGuildLiteBrain(log.guild, log.goblinId, log.liteBrain)
    if (!validation.valid) {
      console.error('Guild litebrain violation detected:', validation.error)
      // Log the violation but still allow the audit log to be recorded
      log.error = validation.error
      log.success = false
    }
  }

  const res = await fetch(`${getBaseUrl()}/v1/router-audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(log),
  })
  return handleResponse<{ success: boolean }>(res)
}

export async function fetchRouterAuditLogs(filters?: {
  guild?: string
  liteBrain?: string
  success?: boolean
  limit?: number
  offset?: number
}): Promise<RouterAuditLog[]> {
  const queryParams = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString())
      }
    })
  }

  const res = await fetch(`${getBaseUrl()}/v1/router-audit?${queryParams}`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<RouterAuditLog[]>(res)
}

export async function fetchGuildKPIMetrics(guild: string): Promise<{
  current: Record<string, number>
  targets: Record<string, number>
  trends: Array<{ timestamp: string; metrics: Record<string, number> }>
}> {
  const res = await fetch(`${getBaseUrl()}/v1/guild-kpi/${guild}`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<{
    current: Record<string, number>
    targets: Record<string, number>
    trends: Array<{ timestamp: string; metrics: Record<string, number> }>
  }>(res)
}
