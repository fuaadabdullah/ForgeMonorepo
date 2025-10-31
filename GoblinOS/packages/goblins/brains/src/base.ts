import { type ProviderClient, createProvider } from '@goblinos/providers'
import { z } from 'zod'

export const LiteBrainConfigSchema = z.object({
  memberId: z.string(),
  name: z.string(),
  defaultModel: z.string(),
  fallbackModels: z.array(z.string()).default([]),
  providerBaseURL: z.string().default(process.env.LITELLM_BASE_URL || 'http://litellm:4000'),
  apiKey: z.string().default(process.env.LITELLM_API_KEY || 'dummy'),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().positive().default(2048),
  timeout: z.number().positive().default(30000),
  embeddingModel: z.string().optional(),
  analyticsTag: z.string().optional(),
})

export type LiteBrainConfig = z.infer<typeof LiteBrainConfigSchema>

export const LiteBrainRequestSchema = z.object({
  task: z.string().min(1),
  context: z.record(z.any()).optional(),
  constraints: z.record(z.any()).optional(),
})

export type LiteBrainRequest = z.infer<typeof LiteBrainRequestSchema>

export const LiteBrainPlanSchema = z.object({
  description: z.string(),
  steps: z.array(
    z.object({
      action: z.string(),
      target: z.string(),
      content: z.string().optional(),
      reasoning: z.string(),
    })
  ),
  estimatedComplexity: z.enum(['low', 'medium', 'high']).default('medium'),
})

export const LiteBrainResponseSchema = z.object({
  success: z.boolean(),
  plan: LiteBrainPlanSchema,
  metadata: z.object({
    model: z.string(),
    processingTime: z.number(),
    tokensUsed: z.number().optional(),
    embeddingModel: z.string().optional(),
    analyticsTag: z.string().optional(),
    memberId: z.string(),
  }),
})

export type LiteBrainResponse = z.infer<typeof LiteBrainResponseSchema>

export class LiteBrainError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'LiteBrainError'
  }
}

export function mergeLiteBrainConfig(
  defaults: LiteBrainConfig,
  overrides: Partial<LiteBrainConfig> = {}
): LiteBrainConfig {
  const sanitizedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  ) as Partial<LiteBrainConfig>

  return LiteBrainConfigSchema.parse({
    ...defaults,
    ...sanitizedOverrides,
  })
}

export class BaseLiteBrain {
  protected config: LiteBrainConfig
  protected provider: ProviderClient

  constructor(config: LiteBrainConfig) {
    this.config = LiteBrainConfigSchema.parse(config)
    this.provider = createProvider({
      baseURL: this.config.providerBaseURL,
      apiKey: this.config.apiKey,
      defaultModel: this.config.defaultModel,
      fallbackModels: this.config.fallbackModels,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      timeout: this.config.timeout,
    })
  }

  getConfig(): LiteBrainConfig {
    return { ...this.config }
  }

  async process(request: LiteBrainRequest): Promise<LiteBrainResponse> {
    const start = Date.now()
    const validated = LiteBrainRequestSchema.parse(request)

    const prompt = this.buildPrompt(validated)
    try {
      const response = await this.provider.chat({
        model: this.config.defaultModel,
        messages: [
          { role: 'system', content: `You are ${this.config.name}, a specialized LiteBrain.` },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      })

      const plan = this.parsePlan(response.content)
      return LiteBrainResponseSchema.parse({
        success: true,
        plan,
        metadata: {
          model: response.model,
          processingTime: Date.now() - start,
          tokensUsed: response.usage?.totalTokens,
          embeddingModel: this.config.embeddingModel,
          analyticsTag: this.config.analyticsTag,
          memberId: this.config.memberId,
        },
      })
    } catch (err) {
      throw new LiteBrainError(
        `LiteBrain processing failed: ${err instanceof Error ? err.message : String(err)}`,
        'PROCESSING_ERROR'
      )
    }
  }

  protected buildPrompt(request: LiteBrainRequest): string {
    const ctx = request.context ? JSON.stringify(request.context, null, 2) : 'None'
    const constraints = request.constraints ? JSON.stringify(request.constraints, null, 2) : 'None'
    return `Task: ${request.task}

Context:
${ctx}

Constraints:
${constraints}

Respond with JSON only using this shape:
{
  "description": string,
  "steps": [{ "action": string, "target": string, "content"?: string, "reasoning": string }],
  "estimatedComplexity": "low"|"medium"|"high"
}`
  }

  protected parsePlan(content: string): z.infer<typeof LiteBrainPlanSchema> {
    try {
      const match = content.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(match ? match[0] : content)
      return LiteBrainPlanSchema.parse(parsed)
    } catch (_e) {
      return {
        description: 'Fallback plan due to parsing error',
        steps: [],
        estimatedComplexity: 'medium',
      }
    }
  }
}
