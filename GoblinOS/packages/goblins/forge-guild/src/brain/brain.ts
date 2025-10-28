import { Ollama } from 'ollama'
import { z } from 'zod'
import type { Logger } from '../types.js'

// Configuration schema for the brain
export const BrainConfigSchema = z.object({
  model: z.string().default('qwen2.5-coder:7b'),
  baseUrl: z.string().default('http://localhost:11434'),
  temperature: z.number().min(0).max(2).default(0.1),
  maxTokens: z.number().positive().default(2048),
  timeout: z.number().positive().default(30000),
  enableTracing: z.boolean().default(true),
})

export type BrainConfig = z.infer<typeof BrainConfigSchema>

// Input schema for brain requests
export const BrainRequestSchema = z.object({
  task: z.string().min(1).max(1000),
  context: z
    .object({
      projectType: z.string().optional(),
      technologies: z.array(z.string()).optional(),
      existingFiles: z.array(z.string()).optional(),
      requirements: z.array(z.string()).optional(),
    })
    .optional(),
  constraints: z
    .object({
      maxFiles: z.number().positive().optional(),
      fileTypes: z.array(z.string()).optional(),
      avoidPatterns: z.array(z.string()).optional(),
    })
    .optional(),
})

export type BrainRequest = z.infer<typeof BrainRequestSchema>

// Output schema for brain responses
export const BrainResponseSchema = z.object({
  success: z.boolean(),
  plan: z.object({
    description: z.string(),
    steps: z.array(
      z.object({
        action: z.string(),
        target: z.string(),
        content: z.string().optional(),
        reasoning: z.string(),
      })
    ),
    estimatedComplexity: z.enum(['low', 'medium', 'high']),
  }),
  warnings: z.array(z.string()).optional(),
  metadata: z.object({
    model: z.string(),
    tokensUsed: z.number().optional(),
    processingTime: z.number(),
  }),
})

export type BrainResponse = z.infer<typeof BrainResponseSchema>

// Error types
export class BrainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'BrainError'
  }
}

// Main brain class
export class SmithyBrain {
  private ollama: Ollama
  private config: BrainConfig
  private logger: Logger

  constructor(logger: Logger, config: Partial<BrainConfig> = {}) {
    this.config = BrainConfigSchema.parse(config)
    this.logger = logger
    this.ollama = new Ollama({
      host: this.config.baseUrl,
    })
  }

  /**
   * Process a scaffolding request using the LLM brain
   */
  async processRequest(request: BrainRequest): Promise<BrainResponse> {
    const startTime = Date.now()

    try {
      // Validate input
      const validatedRequest = BrainRequestSchema.parse(request)

      // Check Ollama health
      await this.checkHealth()

      // Generate scaffolding plan
      const plan = await this.generatePlan(validatedRequest)

      const processingTime = Date.now() - startTime

      return BrainResponseSchema.parse({
        success: true,
        plan,
        metadata: {
          model: this.config.model,
          processingTime,
        },
      })
    } catch (error) {
      const processingTime = Date.now() - startTime

      this.logger.error('Brain processing failed', {
        error: error instanceof Error ? error.message : String(error),
        task: request.task,
        processingTime,
      })

      if (error instanceof z.ZodError) {
        throw new BrainError('Invalid request format', 'VALIDATION_ERROR', error.errors)
      }

      throw new BrainError(
        `Brain processing failed: ${error instanceof Error ? error.message : String(error)}`,
        'PROCESSING_ERROR',
        { processingTime }
      )
    }
  }

  /**
   * Generate a scaffolding plan using the LLM
   */
  private async generatePlan(request: BrainRequest): Promise<BrainResponse['plan']> {
    const prompt = this.buildPrompt(request)

    this.logger.debug?.('Generating plan with Ollama', {
      model: this.config.model,
      promptLength: prompt.length,
    })

    const response = await this.ollama.generate({
      model: this.config.model,
      prompt,
      options: {
        temperature: this.config.temperature,
        num_predict: this.config.maxTokens,
      },
      stream: false,
    })

    // Parse the LLM response
    const plan = this.parsePlanResponse(response.response)

    this.logger.info('Plan generated successfully', {
      steps: plan.steps.length,
      complexity: plan.estimatedComplexity,
      tokensUsed: response.eval_count,
    })

    return {
      ...plan,
      metadata: {
        tokensUsed: response.eval_count,
      },
    } as BrainResponse['plan']
  }

  /**
   * Build the prompt for the LLM
   */
  private buildPrompt(request: BrainRequest): string {
    const contextStr = request.context
      ? this.formatContext(request.context)
      : 'No additional context provided'
    const constraintsStr = request.constraints
      ? this.formatConstraints(request.constraints)
      : 'No specific constraints'

    return `You are Smithy, an expert AI scaffolding assistant for the Forge Guild system.

Your task is to create a detailed scaffolding plan for: ${request.task}

Context:
${contextStr}

Constraints:
${constraintsStr}

Please provide a JSON response with the following structure:
{
  "description": "Brief description of the overall plan",
  "steps": [
    {
      "action": "create_file|modify_file|create_directory",
      "target": "relative/path/to/file",
      "content": "file content or modification details",
      "reasoning": "why this step is needed"
    }
  ],
  "estimatedComplexity": "low|medium|high"
}

Guidelines:
- Focus on creating complete, runnable code
- Use appropriate file extensions and naming conventions
- Include necessary dependencies and configurations
- Ensure code follows best practices for the specified technologies
- Keep file contents concise but complete
- Use relative paths from the project root

Respond with valid JSON only:`
  }

  /**
   * Format context information for the prompt
   */
  private formatContext(context: BrainRequest['context']): string {
    if (!context) return 'No context provided'

    const parts = []
    if (context.projectType) parts.push(`Project Type: ${context.projectType}`)
    if (context.technologies?.length) parts.push(`Technologies: ${context.technologies.join(', ')}`)
    if (context.existingFiles?.length)
      parts.push(`Existing Files: ${context.existingFiles.join(', ')}`)
    if (context.requirements?.length) parts.push(`Requirements: ${context.requirements.join(', ')}`)

    return parts.join('\n')
  }

  /**
   * Format constraints for the prompt
   */
  private formatConstraints(constraints: BrainRequest['constraints']): string {
    if (!constraints) return 'No constraints provided'

    const parts = []
    if (constraints.maxFiles) parts.push(`Maximum files: ${constraints.maxFiles}`)
    if (constraints.fileTypes?.length)
      parts.push(`Allowed file types: ${constraints.fileTypes.join(', ')}`)
    if (constraints.avoidPatterns?.length)
      parts.push(`Avoid patterns: ${constraints.avoidPatterns.join(', ')}`)

    return parts.join('\n')
  }

  /**
   * Parse the LLM response into a structured plan
   */
  private parsePlanResponse(response: string): Omit<BrainResponse['plan'], 'metadata'> {
    try {
      // Extract JSON from response (LLM might add extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate the response structure
      return {
        description: parsed.description || 'Generated scaffolding plan',
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        estimatedComplexity: ['low', 'medium', 'high'].includes(parsed.estimatedComplexity)
          ? parsed.estimatedComplexity
          : 'medium',
      }
    } catch (error) {
      this.logger.warn('Failed to parse LLM response as JSON, using fallback', { error })
      return {
        description: 'Fallback plan due to parsing error',
        steps: [],
        estimatedComplexity: 'medium',
      }
    }
  }

  /**
   * Check if Ollama service is healthy
   */
  private async checkHealth(): Promise<void> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama health check failed: ${response.status}`)
      }

      const data = (await response.json()) as { models?: { name: string }[] }
      const hasModel = data.models?.some((m) => m.name === this.config.model)

      if (!hasModel) {
        throw new Error(`Required model ${this.config.model} not available in Ollama`)
      }

      this.logger.debug?.('Ollama health check passed', { model: this.config.model })
    } catch (error) {
      throw new BrainError(
        `Ollama service unavailable: ${error instanceof Error ? error.message : String(error)}`,
        'OLLAMA_UNAVAILABLE'
      )
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): BrainConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BrainConfig>): void {
    this.config = BrainConfigSchema.parse({ ...this.config, ...updates })
    this.ollama = new Ollama({
      host: this.config.baseUrl,
    })
  }
}
