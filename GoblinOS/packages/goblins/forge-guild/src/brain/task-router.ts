import { z } from 'zod'
import type { Logger } from '../types.js'
import {
  type BrainConfig,
  BrainConfigSchema,
  type BrainRequest,
  type BrainResponse,
  SmithyBrain,
} from './brain.js'
import { type GuardrailConfig, GuardrailConfigSchema, SmithyGuardrails } from './guardrails.js'

// Task router configuration
export const TaskRouterConfigSchema = z.object({
  brain: BrainConfigSchema.optional().default({}),
  guardrails: GuardrailConfigSchema.optional().default({}),
  enableValidation: z.boolean().default(true),
  maxRetries: z.number().min(0).max(5).default(2),
  retryDelay: z.number().min(100).max(5000).default(1000),
  enableFallback: z.boolean().default(true),
})

export type TaskRouterConfig = z.infer<typeof TaskRouterConfigSchema>

// Task context for routing decisions
export const TaskContextSchema = z.object({
  taskId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  tags: z.array(z.string()).default([]),
})

export type TaskContext = z.infer<typeof TaskContextSchema>

// Routing result
export const RoutingResultSchema = z.object({
  success: z.boolean(),
  response: z.any().optional(), // Will be validated by BrainResponse schema
  validation: z.any().optional(), // Will be validated by ValidationResult schema
  error: z.string().optional(),
  retryCount: z.number().default(0),
  processingTime: z.number(),
  fallbackUsed: z.boolean().default(false),
})

export type RoutingResult = z.infer<typeof RoutingResultSchema>

// Task router error
export class TaskRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message)
    this.name = 'TaskRouterError'
  }
}

// Main task router class
export class SmithyTaskRouter {
  private brain: SmithyBrain
  private guardrails: SmithyGuardrails
  private config: TaskRouterConfig
  private logger: Logger

  constructor(logger: Logger, config: Partial<TaskRouterConfig> = {}) {
    this.config = TaskRouterConfigSchema.parse(config)
    this.logger = logger
    this.brain = new SmithyBrain(logger, this.config.brain)
    this.guardrails = new SmithyGuardrails(logger, this.config.guardrails)
  }

  /**
   * Process a scaffolding task with full validation and routing
   */
  async processTask(request: BrainRequest, context: TaskContext): Promise<RoutingResult> {
    const startTime = Date.now()
    let retryCount = 0
    let lastError: Error | null = null

    this.logger.info('Processing task', {
      taskId: context.taskId,
      priority: context.priority,
      tags: context.tags,
    })

    // Validate request first
    if (this.config.enableValidation) {
      const validation = await this.guardrails.validateRequest({
        task: request.task || '',
        context: request.context,
        constraints: request.constraints,
      })
      if (!validation.valid) {
        const criticalIssues = validation.issues.filter((i) => i.severity === 'critical')
        if (criticalIssues.length > 0) {
          return {
            success: false,
            error: `Request validation failed: ${criticalIssues.map((i) => i.message).join(', ')}`,
            validation,
            processingTime: Date.now() - startTime,
            retryCount: 0,
            fallbackUsed: false,
          }
        }
      }
    }

    // Process with retries
    while (retryCount <= this.config.maxRetries) {
      try {
        // Process request through brain
        const response = await this.brain.processRequest(request)

        // Validate response
        if (this.config.enableValidation) {
          const validation = await this.guardrails.validateResponse({
            plan: {
              steps: response.plan.steps.map((step) => ({
                action: step.action,
                target: step.target,
                content: step.content,
              })),
            },
          })
          if (!validation.valid) {
            const criticalIssues = validation.issues.filter((i) => i.severity === 'critical')
            if (criticalIssues.length > 0) {
              throw new TaskRouterError(
                `Response validation failed: ${criticalIssues.map((i) => i.message).join(', ')}`,
                'VALIDATION_FAILED',
                { validation }
              )
            }
          }

          // Sanitize response content
          this.sanitizeResponseContent(response)
        }

        const processingTime = Date.now() - startTime

        this.logger.info('Task processed successfully', {
          taskId: context.taskId,
          retryCount,
          processingTime,
          stepsGenerated: response.plan.steps.length,
        })

        return {
          success: true,
          response,
          retryCount,
          processingTime,
          fallbackUsed: false,
        }
      } catch (error) {
        lastError = error as Error
        retryCount++

        this.logger.warn('Task processing failed, retrying', {
          taskId: context.taskId,
          retryCount,
          error: lastError.message,
          willRetry: retryCount <= this.config.maxRetries,
        })

        // Wait before retry
        if (retryCount <= this.config.maxRetries) {
          await this.delay(this.config.retryDelay * retryCount)
        }
      }
    }

    // All retries exhausted, try fallback if enabled
    if (this.config.enableFallback && lastError) {
      try {
        const fallbackResult = await this.processFallback(request, context)
        if (fallbackResult.success) {
          const processingTime = Date.now() - startTime
          return {
            ...fallbackResult,
            retryCount,
            processingTime,
            fallbackUsed: true,
          }
        }
      } catch (fallbackError) {
        this.logger.error('Fallback processing also failed', {
          taskId: context.taskId,
          fallbackError: (fallbackError as Error).message,
        })
      }
    }

    // Complete failure
    const processingTime = Date.now() - startTime
    const errorMessage = lastError?.message || 'Unknown error occurred'

    this.logger.error('Task processing failed completely', {
      taskId: context.taskId,
      retryCount,
      processingTime,
      error: errorMessage,
    })

    return {
      success: false,
      error: errorMessage,
      retryCount,
      processingTime,
      fallbackUsed: false,
    }
  }

  /**
   * Process a batch of tasks
   */
  async processBatch(
    tasks: Array<{ request: BrainRequest; context: TaskContext }>
  ): Promise<RoutingResult[]> {
    this.logger.info('Processing task batch', { batchSize: tasks.length })

    // Process tasks with concurrency control (max 3 concurrent)
    const results: RoutingResult[] = []
    const concurrencyLimit = 3

    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const batch = tasks.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map((task) => this.processTask(task.request, task.context))

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    const successCount = results.filter((r) => r.success).length
    this.logger.info('Batch processing completed', {
      total: tasks.length,
      successful: successCount,
      failed: tasks.length - successCount,
    })

    return results
  }

  /**
   * Get router health status
   */
  async getHealth(): Promise<{
    brain: boolean
    guardrails: boolean
    overall: boolean
  }> {
    // Check brain health (this would need to be implemented in SmithyBrain)
    const brainHealth = true // Placeholder

    // Guardrails are always healthy (stateless)
    const guardrailsHealth = true

    return {
      brain: brainHealth,
      guardrails: guardrailsHealth,
      overall: brainHealth && guardrailsHealth,
    }
  }

  /**
   * Get router statistics
   */
  getStats(): {
    config: TaskRouterConfig
    brainConfig: BrainConfig
    guardrailsConfig: GuardrailConfig
  } {
    return {
      config: { ...this.config },
      brainConfig: this.brain.getConfig(),
      guardrailsConfig: this.guardrails.getConfig(),
    }
  }

  /**
   * Update router configuration
   */
  updateConfig(updates: Partial<TaskRouterConfig>): void {
    this.config = TaskRouterConfigSchema.parse({ ...this.config, ...updates })

    // Update child components
    this.brain.updateConfig(this.config.brain)
    this.guardrails.updateConfig(this.config.guardrails)

    this.logger.info('Router configuration updated')
  }

  /**
   * Process fallback when primary processing fails
   */
  private async processFallback(
    request: BrainRequest,
    context: TaskContext
  ): Promise<RoutingResult> {
    this.logger.info('Attempting fallback processing', { taskId: context.taskId })

    // Simplified fallback: create a basic plan without LLM
    const fallbackPlan = {
      description: 'Fallback scaffolding plan (simplified)',
      steps: [
        {
          action: 'create_file',
          target: 'README.md',
          content: `# ${request.task}\n\nThis is a fallback implementation.`,
          reasoning: 'Creating basic documentation as fallback',
        },
      ],
      estimatedComplexity: 'low' as const,
    }

    const fallbackResponse: BrainResponse = {
      success: true,
      plan: fallbackPlan,
      metadata: {
        model: 'fallback',
        processingTime: 0,
      },
    }

    return {
      success: true,
      response: fallbackResponse,
      fallbackUsed: true,
      processingTime: 0,
      retryCount: 0,
    }
  }

  /**
   * Sanitize response content using guardrails
   */
  private sanitizeResponseContent(response: BrainResponse): void {
    if (response.plan.steps) {
      response.plan.steps.forEach((step) => {
        if (step.content) {
          step.content = this.guardrails.sanitizeContent(step.content)
        }
      })
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
