export interface ProviderHealthStatus {
  name: string
  ok: boolean
  latency_ms: number
  url: string
  error?: string
}

export interface ProvidersHealthResponse {
  status: 'ok' | 'degraded'
  took_ms: number
  providers: Record<string, ProviderHealthStatus>
}

export interface OllamaModel {
  name: string
  size?: number
  digest?: string
}

export interface OllamaModelDetails {
  name?: string
  size?: number
  digest?: string
  modified_at?: string
  details?: {
    format?: string
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
  }
  template?: string
  parameters?: string
}

export interface PullModelRequest {
  model: string
  stream?: boolean
}

export interface PullModelResponse {
  status: string
  digest?: string
  completed?: boolean
  detail?: string
}

export interface RoutingDecision {
  timestamp: string
  taskType: string
  selectedProvider: string
  selectedModel: string
  reason: string
  latency?: number
  cost?: number
  fallbackUsed?: boolean
}

export interface RoutingStats {
  totalRequests: number
  providerUsage: Record<string, number>
  averageLatency: Record<string, number>
  costSavings: number
  fallbackRate: number
  recentDecisions: RoutingDecision[]
}

export interface DocumentMetadata {
  category?: string
  tags?: string[]
  [key: string]: unknown
}

export interface Document {
  id: string
  title: string
  content: string
  metadata?: DocumentMetadata | null
  embedding?: number[]
}

export interface SearchQuery {
  query: string
  limit?: number
  threshold?: number
}

export interface SearchResult {
  document: Document
  score: number
  highlights: string[]
}

export interface RAGStats {
  totalDocuments: number
  totalTokens: number
  averageDocumentLength: number
  indexSize: number | string
}

export interface RoutingDecision {
  timestamp: string
  taskType: string
  selectedProvider: string
  selectedModel: string
  reason: string
  latency?: number
  cost?: number
  fallbackUsed?: boolean
}

export interface RoutingStats {
  totalRequests: number
  providerUsage: Record<string, number>
  averageLatency: Record<string, number>
  costSavings: number
  fallbackRate: number
  recentDecisions: RoutingDecision[]
}
