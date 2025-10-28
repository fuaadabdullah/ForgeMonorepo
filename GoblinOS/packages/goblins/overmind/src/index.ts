/**
 * 🧙‍♂️ Overmind Chief Goblin Agent
 *
 * Main orchestrator that combines:
 * - Intelligent LLM routing (cost/latency optimized)
 * - Multi-agent crew coordination
 * - Hybrid memory system
 * - Failover and retry logic
 *
 * @module @goblinos/overmind
 */

export * from './types.js'
export * from './config.js'
export * from './router/index.js'
export * from './clients/index.js'
export * from './crew/index.js'
export * from './memory/index.js'

import { trace } from '../observability/tracing.js'
import { LLMClientFactory, executeWithRetry } from './clients/index.js'
import { loadConfig } from './config.js'
import { Agent, Crew, DEFAULT_AGENTS } from './crew/index.js'
import { type MemoryManager, createMemoryManager } from './memory/index.js'
import { classifyComplexity, getFailoverProvider, routeQuery } from './router/index.js'
import type {
  AgentConfig,
  CrewConfig,
  Message,
  OvermindConfig,
  RouterDecision,
  Task,
} from './types.js'
import { DEFAULT_OVERMIND_PERSONA, type LLMProvider } from './types.js'

/**
 * Tracer for Overmind operations
 */
const tracer = trace.getTracer('overmind-orchestrator')

/**
 * Main Overmind orchestrator class
 */
export class Overmind {
  private config: OvermindConfig
  private clientFactory: LLMClientFactory
  private memory: MemoryManager
  private activeCrews: Map<string, Crew>
  private conversationHistory: Message[]
  private routingStats: RouterDecision[]

  constructor(config?: OvermindConfig) {
    this.config = config || loadConfig()
    this.clientFactory = new LLMClientFactory(this.config)
    this.memory = createMemoryManager({
      shortTerm: {
        maxMessages: 20,
        ttlSeconds: 3600,
      },
      working: {
        maxEntries: 50,
        ttlSeconds: 7200,
      },
      longTerm: {
        enabled: true,
        dbPath: './data/memory.db',
        vectorDbPath: './data/vectors',
        vectorDimensions: 1536,
      },
      entities: {
        enabled: true,
        minConfidence: 0.7,
        maxEntities: 1000,
      },
      episodes: {
        enabled: true,
        autoSummarize: true,
        minMessagesPerEpisode: 5,
        maxEpisodes: 100,
      },
      vectorSearch: {
        enabled: false,
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-ada-002',
        topK: 5,
        minSimilarity: 0.7,
      },
    })
    this.activeCrews = new Map()
    this.conversationHistory = [
      {
        role: 'system',
        content: DEFAULT_OVERMIND_PERSONA.systemPrompt,
      },
    ]
    this.routingStats = []
  }

  /**
   * Chat with Overmind directly (single query)
   */
  async chat(userMessage: string): Promise<{
    response: string
    routing: RouterDecision
    metrics: {
      latency: number
      tokens: number
      cost: number
    }
  }> {
    return tracer.startActiveSpan('overmind.chat', async (span: any) => {
      try {
        span.setAttribute('message.length', userMessage.length)

        // Add user message to history and memory
        const userMsg: Message = {
          role: 'user',
          content: userMessage,
        }
        this.conversationHistory.push(userMsg)
        this.memory.addMessage(userMsg)

        // Route query to optimal LLM
        const routing = routeQuery(userMessage, this.config)
        this.routingStats.push(routing)

        span.setAttribute('routing.provider', routing.selectedProvider)
        span.setAttribute('routing.model', routing.selectedModel)
        span.setAttribute('routing.estimated_cost', routing.estimatedCost)
        span.setAttribute('routing.estimated_latency', routing.estimatedLatency)

        // Get client and execute
        const client = this.clientFactory.getClient(routing.selectedProvider)
        const startTime = Date.now()

        try {
          const response = await executeWithRetry(
            client,
            this.conversationHistory,
            routing.selectedModel,
            {
              maxRetries: 3,
              timeout: 30000,
            }
          )

          const latency = Date.now() - startTime

          // Add assistant response to history and memory
          const assistantMsg: Message = {
            role: 'assistant',
            content: response.content,
          }
          this.conversationHistory.push(assistantMsg)
          this.memory.addMessage(assistantMsg)

          // Manage history length
          if (this.conversationHistory.length > 21) {
            this.conversationHistory = [
              this.conversationHistory[0], // Keep system prompt
              ...this.conversationHistory.slice(-20),
            ]
          }

          span.setAttribute('response.latency', latency)
          span.setAttribute('response.tokens', response.usage?.totalTokens || 0)

          return {
            response: response.content,
            routing,
            metrics: {
              latency,
              tokens: response.usage?.totalTokens || 0,
              cost: routing.estimatedCost,
            },
          }
        } catch (error) {
          span.recordException(error as Error)
          span.setAttribute('error.type', (error as Error).name)

          // Try failover if enabled
          if (this.config.routing.enableFailover) {
            const failover = getFailoverProvider(
              this.config,
              routing.selectedProvider,
              routing.complexity
            )

            if (failover) {
              span.setAttribute('routing.failover_provider', failover.provider)
              span.setAttribute('routing.failover_model', failover.model)

              const failoverClient = this.clientFactory.getClient(failover.provider)
              const failoverResponse = await executeWithRetry(
                failoverClient,
                this.conversationHistory,
                failover.model,
                { maxRetries: 2 }
              )

              const failoverMsg: Message = {
                role: 'assistant',
                content: failoverResponse.content,
              }
              this.conversationHistory.push(failoverMsg)
              this.memory.addMessage(failoverMsg)

              return {
                response: failoverResponse.content,
                routing: {
                  ...routing,
                  selectedProvider: failover.provider,
                  selectedModel: failover.model,
                  reason: `Failover from ${routing.selectedProvider}: ${(error as Error).message}`,
                },
                metrics: {
                  latency: Date.now() - startTime,
                  tokens: failoverResponse.usage?.totalTokens || 0,
                  cost: routing.estimatedCost,
                },
              }
            }
          }

          throw error
        }
      } finally {
        span.end()
      }
    })
  }

  /**
   * Create and run a specialized crew for complex tasks
   */
  async runCrew(
    crewConfig: CrewConfig,
    tasks: Task[]
  ): Promise<{
    results: Map<string, unknown>
    crewId: string
  }> {
    return tracer.startActiveSpan('overmind.runCrew', async (span: any) => {
      try {
        span.setAttribute('crew.id', crewConfig.id)
        span.setAttribute('crew.name', crewConfig.name)
        span.setAttribute('crew.agents_count', crewConfig.agents.length)
        span.setAttribute('crew.tasks_count', tasks.length)
        span.setAttribute('crew.process', crewConfig.process)

        const crew = new Crew(crewConfig, this.clientFactory)
        this.activeCrews.set(crew.id, crew)

        // Add tasks to crew
        for (const task of tasks) {
          crew.addTask(task)
        }

        // Run crew
        const results = await crew.run()

        span.setAttribute('crew.results_count', results.size)
        span.setAttribute('crew.status', 'completed')

        return {
          results,
          crewId: crew.id,
        }
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        span.setAttribute('crew.status', 'failed')
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Quick crew: spawn default goblin crew for a task
   */
  async quickCrew(
    taskPrompt: string,
    options?: {
      roles?: Array<keyof typeof DEFAULT_AGENTS>
      process?: 'sequential' | 'parallel' | 'hierarchical'
    }
  ): Promise<string> {
    return tracer.startActiveSpan('overmind.quickCrew', async (span: any) => {
      try {
        span.setAttribute('quickcrew.task_length', taskPrompt.length)
        span.setAttribute('quickcrew.roles_count', options?.roles?.length || 3)
        span.setAttribute('quickcrew.process', options?.process || 'hierarchical')

        const roles = options?.roles || ['orchestrator', 'researcher', 'analyst']
        const process = options?.process || 'hierarchical'

        // Build crew config
        const agentConfigs: AgentConfig[] = roles.map((role, idx) => ({
          id: `agent-${role}-${idx}`,
          ...DEFAULT_AGENTS[role],
        }))

        const crewConfig: CrewConfig = {
          id: `crew-${Date.now()}`,
          name: 'Quick Crew',
          description: 'Auto-generated crew for task execution',
          agents: agentConfigs,
          maxConcurrency: 3,
          process,
          memory: true,
        }

        // Create main task
        const mainTask: Task = {
          id: `task-${Date.now()}`,
          type: 'general',
          prompt: taskPrompt,
          state: 'pending',
          createdAt: new Date(),
          dependencies: [],
          priority: 5,
        }

        const { results } = await this.runCrew(crewConfig, [mainTask])

        // Return aggregated results
        const aggregated = Array.from(results.values()).join('\n\n')
        span.setAttribute('quickcrew.results_length', aggregated.length)

        return aggregated
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  } /**
   * Get Overmind's routing statistics
   */
  getRoutingStats(): {
    totalRequests: number
    byProvider: Record<string, number>
    byComplexity: Record<string, number>
    averageCost: number
    averageLatency: number
  } {
    const byProvider: Record<string, number> = {}
    const byComplexity: Record<string, number> = {}
    let totalCost = 0
    let totalLatency = 0

    for (const stat of this.routingStats) {
      byProvider[stat.selectedProvider] = (byProvider[stat.selectedProvider] || 0) + 1
      byComplexity[stat.complexity] = (byComplexity[stat.complexity] || 0) + 1
      totalCost += stat.estimatedCost
      totalLatency += stat.estimatedLatency
    }

    return {
      totalRequests: this.routingStats.length,
      byProvider,
      byComplexity,
      averageCost: totalCost / (this.routingStats.length || 1),
      averageLatency: totalLatency / (this.routingStats.length || 1),
    }
  }

  /**
   * Get status of active crews
   */
  getCrewsStatus(): Array<ReturnType<Crew['getStatus']>> {
    return Array.from(this.activeCrews.values()).map((crew) => crew.getStatus())
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversationHistory = [
      {
        role: 'system',
        content: DEFAULT_OVERMIND_PERSONA.systemPrompt,
      },
    ]
  }

  /**
   * Get current configuration
   */
  getConfig(): OvermindConfig {
    return this.config
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return this.clientFactory.getAvailableProviders()
  }

  // ============================================================================
  // Memory Methods
  // ============================================================================

  /**
   * Store a fact or insight in long-term memory
   */
  async rememberFact(fact: string, metadata?: Record<string, unknown>): Promise<string> {
    return tracer.startActiveSpan('overmind.rememberFact', async (span: any) => {
      try {
        span.setAttribute('memory.operation', 'store_fact')
        span.setAttribute('memory.fact_length', fact.length)
        span.setAttribute('memory.has_metadata', !!metadata)

        const factId = await this.memory.storeFact(fact, metadata)
        span.setAttribute('memory.fact_id', factId)

        return factId
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Search across all memory systems
   */
  async searchMemory(query: string, limit = 10) {
    return tracer.startActiveSpan('overmind.searchMemory', async (span: any) => {
      try {
        span.setAttribute('memory.operation', 'search')
        span.setAttribute('memory.query_length', query.length)
        span.setAttribute('memory.limit', limit)

        const results = await this.memory.search({ query, limit })
        span.setAttribute('memory.results_count', results.length)

        return results
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Track an entity mention
   */
  async trackEntity(
    name: string,
    type: 'person' | 'organization' | 'location' | 'concept' | 'tool' | 'other',
    attributes?: Record<string, unknown>
  ): Promise<string> {
    return tracer.startActiveSpan('overmind.trackEntity', async (span: any) => {
      try {
        span.setAttribute('memory.operation', 'track_entity')
        span.setAttribute('memory.entity_name', name)
        span.setAttribute('memory.entity_type', type)
        span.setAttribute('memory.has_attributes', !!attributes)

        const entityId = await this.memory.trackEntity(name, type, attributes || {})
        span.setAttribute('memory.entity_id', entityId)

        return entityId
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Create an episode from recent conversation
   */
  async createEpisode(title: string, summary: string, tags: string[] = []): Promise<string> {
    return tracer.startActiveSpan('overmind.createEpisode', async (span: any) => {
      try {
        span.setAttribute('memory.operation', 'create_episode')
        span.setAttribute('memory.episode_title', title)
        span.setAttribute('memory.episode_summary_length', summary.length)
        span.setAttribute('memory.episode_tags_count', tags.length)

        const episodeId = await this.memory.createEpisode(title, summary, tags)
        span.setAttribute('memory.episode_id', episodeId)

        return episodeId
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    return tracer.startActiveSpan('overmind.getMemoryStats', async (span: any) => {
      try {
        span.setAttribute('memory.operation', 'get_stats')

        const stats = await this.memory.getStats()
        span.setAttribute('memory.stats_short_term_count', stats.shortTerm?.count || 0)
        span.setAttribute('memory.stats_working_count', stats.working?.count || 0)
        span.setAttribute('memory.stats_long_term_entries', stats.longTerm?.totalEntries || 0)
        span.setAttribute('memory.stats_long_term_entities', stats.longTerm?.entities || 0)
        span.setAttribute('memory.stats_long_term_episodes', stats.longTerm?.episodes || 0)

        return stats
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Set temporary task context (working memory)
   */
  setTaskContext(key: string, value: string, metadata?: Record<string, unknown>): void {
    tracer.startActiveSpan('overmind.setTaskContext', (span: any) => {
      try {
        span.setAttribute('memory.operation', 'set_context')
        span.setAttribute('memory.context_key', key)
        span.setAttribute('memory.context_value_length', value.length)
        span.setAttribute('memory.has_metadata', !!metadata)

        this.memory.setContext(key, value, metadata)
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Get task context
   */
  getTaskContext(key: string): string | null {
    return tracer.startActiveSpan('overmind.getTaskContext', (span: any) => {
      try {
        span.setAttribute('memory.operation', 'get_context')
        span.setAttribute('memory.context_key', key)

        const value = this.memory.getContext(key)
        span.setAttribute('memory.context_found', value !== null)

        return value
      } catch (error) {
        span.recordException(error as Error)
        span.setAttribute('error.type', (error as Error).name)
        throw error
      } finally {
        span.end()
      }
    })
  }

  /**
   * Shutdown Overmind (cleanup resources)
   */
  shutdown(): void {
    this.memory.shutdown()
  }
}

/**
 * Create Overmind instance with default config
 */
export function createOvermind(config?: OvermindConfig): Overmind {
  return new Overmind(config)
}
