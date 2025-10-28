const API_BASE = '/api/v1'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export interface ChatRequest {
  message: string
  stream?: boolean
}

export interface ChatResponse {
  response: string
  provider: string
  model: string
  routing: {
    strategy: string
    reason: string
  }
  metrics: {
    latency: number
    tokens: number
    cost: number
  }
}

export interface MemoryStats {
  shortTerm: {
    count: number
    oldestTimestamp: number
  }
  working: {
    count: number
    capacity: number
    utilizationPercent: number
  }
  longTerm: {
    memories: number
    entities: number
    episodes: number
  }
}

export interface RoutingStats {
  totalRequests: number
  byProvider: Record<string, number>
  byStrategy: Record<string, number>
  avgLatency: number
  totalCost: number
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  dependencies: {
    nodeService: 'up' | 'down'
  }
}

class ApiClient {
  async chat(message: string): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`)
    return res.json()
  }

  async getHistory(): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/chat/history`)
    if (!res.ok) throw new Error(`Get history failed: ${res.statusText}`)
    return res.json()
  }

  async clearHistory(): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/history`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Clear history failed: ${res.statusText}`)
  }

  async getMemoryStats(): Promise<MemoryStats> {
    const res = await fetch('http://localhost:3030/memory/stats')
    if (!res.ok) throw new Error(`Get memory stats failed: ${res.statusText}`)
    return res.json()
  }

  async getRoutingStats(): Promise<RoutingStats> {
    const res = await fetch('http://localhost:3030/stats')
    if (!res.ok) throw new Error(`Get routing stats failed: ${res.statusText}`)
    return res.json()
  }

  async getHealth(): Promise<HealthCheck> {
    const res = await fetch(`${API_BASE}/system/health`)
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`)
    return res.json()
  }

  async getProviders(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/system/providers`)
    if (!res.ok) throw new Error(`Get providers failed: ${res.statusText}`)
    return res.json()
  }
}

export const api = new ApiClient()
