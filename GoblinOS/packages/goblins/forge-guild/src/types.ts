/**
 * @goblinos/forge-guild
 *
 * TypeScript types and interfaces for Forge Guild - Goblin Smithy Backend
 */

export interface ProjectConfig {
  name: string
  version: string
  description?: string
  author?: string
  license?: string
}

export interface PythonProjectConfig extends ProjectConfig {
  pythonVersion: string
  dependencies: string[]
  devDependencies?: string[]
  tool?: 'poetry' | 'pipenv' | 'requirements'
}

export interface IaCConfig {
  provider: 'terraform' | 'arm' | 'cloudformation' | 'ansible'
  cloud: 'aws' | 'azure' | 'gcp' | 'multi'
  resources: string[]
  environment: string
}

export interface ContainerConfig {
  baseImage: string
  features: string[]
  extensions?: string[]
  ports?: number[]
  volumes?: string[]
}

export interface PipelineConfig {
  provider: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'azure-devops'
  name: string
  triggers: string[]
  environments: string[]
  jobs: Record<string, PipelineJob>
}

export interface PipelineJob {
  runsOn?: string
  needs?: string[]
  environment?: string
  steps: PipelineStep[]
}

export interface PipelineStep {
  name: string
  uses?: string
  run?: string
  with?: Record<string, unknown>
}

export interface ConfigurationSource {
  type: 'env' | 'file' | 'vault'
  path?: string
  format?: 'json' | 'yaml' | 'toml' | 'dotenv'
  required?: boolean
}

export interface VaultConfig {
  provider: 'hashicorp' | 'aws' | 'azure' | 'gcp'
  address?: string
  token?: string
  secrets: Record<string, string>
}

export interface GitOpsConfig {
  basePath: string
  overlays: string[]
  images: Record<string, string>
  namespace?: string
}

export interface ForgeGuildOptions {
  logger?: Logger
  cacheDir?: string
  templatesDir?: string
  dryRun?: boolean
}

export interface Logger {
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string | Error, meta?: Record<string, unknown>) => void
  debug?: (msg: string, meta?: Record<string, unknown>) => void
}

export interface ScaffoldResult {
  path: string
  files: string[]
  nextSteps: string[]
  commands: string[]
}

export interface EnvironmentResult {
  files: string[]
  commands: string[]
  variables: Record<string, string>
}

export interface DependencyResult {
  lockfile: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  scripts: Record<string, string>
}

export interface ConfigurationResult {
  sources: ConfigurationSource[]
  variables: Record<string, unknown>
  secrets: string[]
}

export interface PipelineResult {
  files: string[]
  workflows: string[]
  triggers: string[]
}

/**
 * Smithy-Overmind Integration Types
 */
// Re-export Overmind types for convenience
export type {
  Message,
  Task,
  AgentConfig,
  CrewConfig,
  RouterDecision,
  OvermindConfig,
} from '@goblinos/overmind'

// Re-export memory types
export type {
  MemoryManager,
  MemoryConfig,
  MemoryEntry,
  MemorySearchResult,
} from '@goblinos/overmind/src/memory'

// Smithy-Overmind integration context
export interface SmithyOvermindContext {
  /** Current conversation context from Overmind */
  conversationHistory: Message[]
  /** Relevant memories for the current task */
  relevantMemories: MemorySearchResult[]
  /** Current working memory context */
  workingContext: Record<string, string>
  /** Task context if part of a larger workflow */
  taskContext?: Task
  /** User preferences and patterns */
  userPreferences: Record<string, unknown>
}

export interface SmithyOvermindIntegration {
  /** Get context from Overmind for Smithy operations */
  getContextForSmithy(taskDescription: string): Promise<SmithyOvermindContext>
  /** Store Smithy results in Overmind memory */
  storeSmithyResult(
    taskDescription: string,
    result: any,
    success: boolean,
    metadata?: Record<string, unknown>
  ): Promise<void>
  /** Learn from Smithy operations for future improvements */
  learnFromSmithyOperation(
    operation: string,
    success: boolean,
    metrics: Record<string, number>,
    feedback?: string
  ): Promise<void>
}
