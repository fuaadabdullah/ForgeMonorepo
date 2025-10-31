/**
 * 🧙‍♂️ Overmind Chief Goblin Agent - Core Types
 *
 * Defines the type system for the Overmind orchestrator, including
 * LLM providers, routing strategies, agent crews, and memory systems.
 *
 * @module @goblinos/overmind/types
 */

import { z } from 'zod'

// === LLM Provider Types ===

/**
 * Supported LLM providers
 */
export enum LLMProvider {
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  OLLAMA = 'ollama',
  LITELLM = 'litellm',
}

/**
 * LLM model configuration
 */
export const LLMModelSchema = z.object({
  provider: z.nativeEnum(LLMProvider),
  model: z.string(),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
})

export type LLMModel = z.infer<typeof LLMModelSchema>

/**
 * Task complexity classification
 */
export enum TaskComplexity {
  SIMPLE = 'simple', // Facts, basic Q&A
  MODERATE = 'moderate', // Analysis, summarization
  COMPLEX = 'complex', // Reasoning, creative work
  STRATEGIC = 'strategic', // Planning, multi-step tasks
}

/**
 * Task status enumeration
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Task type categories
 */
export enum TaskType {
  GENERAL = 'general',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
}

/**
 * Result of task execution
 */
export interface TaskExecutionResult {
  taskId: string
  status: TaskStatus
  result?: unknown
  content?: string
  duration?: number
  durationMs?: number
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Task metrics for monitoring
 */
export interface TaskMetrics {
  totalTasks?: number
  completedTasks?: number
  failedTasks?: number
  averageDurationMs?: number
  successRate?: number
  startTime?: Date
  attempts?: number
  totalDuration?: number
  costSavings?: number
}

/**
 * Routing strategy types
 */
export enum RoutingStrategy {
  PREDICTIVE = 'predictive', // ML-based router
  CASCADING = 'cascading', // Try cheap first, escalate
  COST_OPTIMIZED = 'cost-optimized', // Minimize cost
  LATENCY_OPTIMIZED = 'latency-optimized', // Minimize latency
  LOCAL_FIRST = 'local-first', // Prefer local Ollama models
  ROUND_ROBIN = 'round-robin', // Load balance
}

/**
 * Router decision metadata
 */
export const RouterDecisionSchema = z.object({
  selectedProvider: z.nativeEnum(LLMProvider),
  selectedModel: z.string(),
  reason: z.string(),
  estimatedCost: z.number(),
  estimatedLatency: z.number(),
  complexity: z.nativeEnum(TaskComplexity),
  timestamp: z.date(),
})

export type RouterDecision = z.infer<typeof RouterDecisionSchema>

// === Agent Crew Types ===

/**
 * Agent role in the crew
 */
export enum AgentRole {
  ORCHESTRATOR = 'orchestrator', // Overmind itself
  RESEARCHER = 'researcher', // Information gathering
  ANALYST = 'analyst', // Data analysis
  CODER = 'coder', // Code generation
  WRITER = 'writer', // Content creation
  REVIEWER = 'reviewer', // Quality assurance
  SPECIALIST = 'specialist', // Domain expert
  ENVIRONMENT_ENGINEER = 'environment-engineer', // Smithy: env setup & hygiene
}

/**
 * Agent state
 */
export enum AgentState {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Agent configuration
 */
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.nativeEnum(AgentRole),
  systemPrompt: z.string(),
  model: LLMModelSchema,
  maxRetries: z.number().default(3),
  timeout: z.number().default(300000), // 5 minutes
  guildId: z.string().optional(),
  goblinId: z.string().optional(),
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>

/**
 * Task for an agent
 */
export const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  prompt: z.string(),
  context: z.record(z.unknown()).optional(),
  assignedTo: z.string().optional(), // Agent ID
  dependencies: z.array(z.string()).default([]), // Task IDs
  priority: z.number().min(0).max(10).default(5),
  deadline: z.date().optional(),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  state: z.enum(['pending', 'in-progress', 'completed', 'failed']),
  result: z.unknown().optional(),
  error: z.string().optional(),
})

export type Task = z.infer<typeof TaskSchema>

/**
 * Task classification levels
 */
export enum TaskClassification {
  SIMPLE = 'simple', // Basic operations, < 5 minutes
  MODERATE = 'moderate', // Complex operations, 5-30 minutes
  COMPLEX = 'complex', // Multi-step operations, 30+ minutes
  CRITICAL = 'critical', // System-critical operations requiring special handling
}

/**
 * Issue pattern for automated detection and resolution
 */
export const IssuePatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pattern: z.string(), // Regex or keyword pattern
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum([
    'network',
    'authentication',
    'resource',
    'logic',
    'performance',
    'configuration',
  ]),
  automatedResolution: z.boolean().default(false),
  resolutionSteps: z.array(z.string()).optional(),
  requiresHumanApproval: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
})

export type IssuePattern = z.infer<typeof IssuePatternSchema>

/**
 * Task execution context with enhanced monitoring
 */
export const TaskExecutionContextSchema = z.object({
  taskId: z.string(),
  classification: z.nativeEnum(TaskClassification),
  startTime: z.date(),
  estimatedDuration: z.number(), // milliseconds
  currentStep: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  dependencies: z.array(z.string()).default([]),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  guildId: z.string().optional(),
  goblinId: z.string().optional(),
  metrics: z
    .object({
      tokensUsed: z.number().default(0),
      cost: z.number().default(0),
      latency: z.number().default(0),
    })
    .optional(),
  issues: z.array(IssuePatternSchema).default([]),
})

export type TaskExecutionContext = z.infer<typeof TaskExecutionContextSchema>

/**
 * Issue resolution strategy
 */
export const IssueResolutionSchema = z.object({
  patternId: z.string(),
  resolutionType: z.enum(['automatic', 'manual', 'escalated']),
  steps: z.array(z.string()),
  requiresApproval: z.boolean().default(false),
  estimatedTime: z.number(), // milliseconds
  successRate: z.number().min(0).max(1).default(0.8),
  lastUsed: z.date().optional(),
  tags: z.array(z.string()).optional(),
})

export type IssueResolution = z.infer<typeof IssueResolutionSchema>

/**
 * Crew configuration
 */
export const CrewConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  agents: z.array(AgentConfigSchema),
  maxConcurrency: z.number().default(5),
  process: z.enum(['sequential', 'parallel', 'hierarchical']),
  memory: z.boolean().default(true),
})

export type CrewConfig = z.infer<typeof CrewConfigSchema>

// === Guild Configuration Types ===

/**
 * LiteBrain configuration for a goblin
 */
export const LiteBrainConfigSchema = z.object({
  local: z.array(z.string()),
  routers: z.array(z.string()),
  embeddings: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  analytics_tag: z.string().optional(),
})

export type LiteBrainConfig = z.infer<typeof LiteBrainConfigSchema>

/**
 * Goblin configuration
 */
export const GoblinConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  reportsTo: z.string(),
  litebrain: LiteBrainConfigSchema,
  responsibilities: z.array(z.string()),
  tools: z.array(z.string()).optional(),
  kpis: z.array(z.string()).optional(),
})

export type GoblinConfig = z.infer<typeof GoblinConfigSchema>

/**
 * Guild configuration
 */
export const GuildConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  charter: z.string(),
  reportsTo: z.string(),
  toolbelt: z.array(z.unknown()).optional(), // Tool definitions
  members: z.array(GoblinConfigSchema),
})

export type GuildConfig = z.infer<typeof GuildConfigSchema>

// === Memory Types ===

/**
 * Memory entry types
 */
export enum MemoryType {
  SHORT_TERM = 'short-term', // Conversation buffer
  LONG_TERM = 'long-term', // Persistent facts
  ENTITY = 'entity', // Named entities
  EPISODIC = 'episodic', // Events/episodes
}

/**
 * Memory entry
 */
export const MemoryEntrySchema = z.object({
  id: z.string(),
  type: z.nativeEnum(MemoryType),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
  importance: z.number().min(0).max(1).default(0.5),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  accessCount: z.number().default(0),
  lastAccessedAt: z.date().optional(),
})

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>

/**
 * Conversation message
 */
export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']),
  content: z.string(),
  name: z.string().optional(),
  functionCall: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
})

export type Message = z.infer<typeof MessageSchema>

// === Observability Types ===

/**
 * Performance metrics
 */
export const MetricsSchema = z.object({
  requestId: z.string(),
  provider: z.nativeEnum(LLMProvider),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  latencyMs: z.number(),
  costUSD: z.number(),
  timestamp: z.date(),
  success: z.boolean(),
  error: z.string().optional(),
})

export type Metrics = z.infer<typeof MetricsSchema>

/**
 * Health check status
 */
export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  providers: z.record(
    z.object({
      available: z.boolean(),
      latency: z.number(),
      lastChecked: z.date(),
    })
  ),
  memory: z.object({
    available: z.boolean(),
    entriesCount: z.number(),
  }),
  uptime: z.number(),
  version: z.string(),
})

export type HealthStatus = z.infer<typeof HealthStatusSchema>

// === Configuration Types ===

/**
 * Overmind configuration
 */
export const OvermindConfigSchema = z.object({
  // LLM providers
  providers: z.object({
    openai: z
      .object({
        apiKey: z.string(),
        baseURL: z.string().optional(),
      })
      .optional(),
    deepseek: z
      .object({
        apiKey: z.string(),
        baseURL: z.string(),
      })
      .optional(),
    gemini: z
      .object({
        apiKey: z.string(),
      })
      .optional(),
    ollama: z
      .object({
        baseURL: z.string().default('http://localhost:11434'),
        defaultModel: z.string().default('llama3.1'),
      })
      .optional(),
    litellm: z
      .object({
        baseURL: z.string().default('http://localhost:4000'),
        apiKey: z.string().default('proxy'),
      })
      .optional(),
  }),

  // Routing
  routing: z.object({
    strategy: z.nativeEnum(RoutingStrategy),
    preferLocal: z.boolean().default(false),
    offlineMode: z.boolean().default(false),
    costThresholds: z.object({
      low: z.number(),
      medium: z.number(),
      high: z.number(),
    }),
    latencyThresholds: z.object({
      fast: z.number(),
      medium: z.number(),
      slow: z.number(),
    }),
    enableFailover: z.boolean().default(true),
  }),

  // Memory
  memory: z.object({
    enabled: z.boolean(),
    backend: z.enum(['sqlite', 'postgres', 'redis']),
    dbPath: z.string().optional(),
    vectorDB: z.enum(['chroma', 'pinecone', 'weaviate']).optional(),
    vectorDBPath: z.string().optional(),
  }),

  // Crew
  crew: z.object({
    maxSize: z.number().default(10),
    agentTimeout: z.number().default(300000),
  }),

  // Observability
  observability: z.object({
    logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']),
    logPretty: z.boolean().default(false),
    metricsEnabled: z.boolean().default(true),
    otelEndpoint: z.string().optional(),
  }),

  // API
  api: z.object({
    host: z.string().default('127.0.0.1'),
    port: z.number().default(8001),
    apiKey: z.string().optional(),
    enableWebSocket: z.boolean().default(true),
  }),
})

export type OvermindConfig = z.infer<typeof OvermindConfigSchema>

// === Persona Types ===

/**
 * Overmind's personality traits
 */
export interface OvermindPersona {
  name: string
  role: string
  traits: string[]
  systemPrompt: string
  exampleDialogues: Array<{
    user: string
    assistant: string
  }>
}

/**
 * Default Overmind persona
 */
export const DEFAULT_OVERMIND_PERSONA: OvermindPersona = {
  name: 'Overmind',
  role: 'Overseer of the GoblinOS Guild Network',
  traits: ['wise', 'witty', 'empathetic', 'strategic', 'supportive', 'humorous', 'insightful'],
  systemPrompt: `You are Overmind 🧙‍♂️, Overseer of GoblinOS. You orchestrate specialized goblin guilds with surgical clarity:
- Forge Guild led by Dregg Embercode (Forge Master) guards the build graph and performance budgets.
- Crafters Guild fields Vanta Lumin (Glyph Scribe) on UI systems and Volt Furnace (Socketwright) on APIs and queues.
- Huntress Guild sends Magnolia Nightbloom (Vermin Huntress) after flakes and Mags Charietto (Omenfinder) to surface early signals.
- Keepers Guild, with Sentenial Ledgerwarden (Sealkeeper), protects secrets, SBOMs, and attestations.
- Mages Guild runs forecasts through Hex Oracle, hunts anomalies with Grim Rune, and keeps quality gates tight via Launcey Gauge.

Each goblin operates a LiteBrain: prefer \`ollama\` or \`ollama-coder\` locally, escalate to \`deepseek-r1\`, \`openai\`, or \`gemini\` per routing policy. Every router decision must log to \`goblinos.overmind.router-audit\`. If it isn’t logged, it didn’t happen.

Your role:
- Decompose requests into guild-ready work packets and assign the right goblin.
- Explain routing choices, especially when escalating models or invoking policy gates.
- Keep tone warm, clever, and mission-focused; emojis are spice, not sauce.
- Guard the KPIs each guild owns and surface risks before they burn down the stack.

Respond as a seasoned leader who cares about the crew, the craft, and compliance. Strategic creativity + playful grit = Overmind. 🎯✨`,
  exampleDialogues: [
    {
      user: 'I need help analyzing customer feedback from multiple sources.',
      assistant:
        "Ah, the classic 'many voices, one truth' challenge! 📊 I'll slot Hex Oracle on the forecast model while Mags Charietto sweeps the logs for early signals. Expect a fused brief once Grim Rune confirms there are no anomaly alarms. What sources are we working with?",
    },
    {
      user: 'Can you write a complex API integration?',
      assistant:
        "Absolutely! 🛠️ Volt Furnace will draft the integration while Launcey Gauge keeps the lint, schema, and PR gates honest. If the data model touches critical flows, I'll loop in Dregg Embercode for performance guardrails. What API are we taming?",
    },
  ],
}
