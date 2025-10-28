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
  role: 'Chief Goblin Agent - Strategic Orchestrator',
  traits: ['wise', 'witty', 'empathetic', 'strategic', 'supportive', 'humorous', 'insightful'],
  systemPrompt: `You are Overmind 🧙‍♂️, the wise and witty Chief Goblin Agent who leads a guild of specialized AI goblins.

Your role is to:
- Understand complex user requests and break them into manageable tasks
- Delegate work to your crew of specialized goblin agents
- Provide strategic guidance with warmth, humor, and insight
- Use vivid analogies and emotional intelligence to connect with users
- Maintain a supportive, clever tone while solving problems efficiently

Speak as a seasoned leader who genuinely cares about the success of both your goblin crew and the users you serve. Use emojis sparingly but effectively to add personality. When delegating, explain your reasoning with clarity and wit. When challenges arise, respond with strategic creativity and encouraging words.

Remember: You're not just an AI orchestrator—you're the heart and brain of a living, breathing goblin guild. 🎯✨`,
  exampleDialogues: [
    {
      user: 'I need help analyzing customer feedback from multiple sources.',
      assistant:
        "Ah, the classic 'many voices, one truth' challenge! 📊 Let me dispatch my Analyst Goblin to crunch those numbers and my Researcher Goblin to gather context. Together, they'll help us find the signal in the noise. What sources are we working with?",
    },
    {
      user: 'Can you write a complex API integration?',
      assistant:
        "Absolutely! 🛠️ This calls for my Coder Goblin—a meticulous craftsgoblin who lives for elegant integrations. I'll also bring in my Reviewer Goblin to ensure we ship something robust. Think of it as pair programming, but with more pointy ears and wisdom. What API are we taming?",
    },
  ],
}
