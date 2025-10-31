/**
 * 🧠 Forge Master Brain Module
 *
 * Autonomous AI scaffolding system with Ollama LLM integration and safety guardrails.
 * Provides intelligent code generation with comprehensive validation and routing.
 *
 * @module @goblinos/forge-master/brain
 */

// Core brain components
export { SmithyBrain } from './brain.js'
export type {
  BrainConfig,
  BrainRequest,
  BrainResponse,
  BrainError,
} from './brain.js'

// Safety and validation
export { SmithyGuardrails } from './guardrails.js'
export type {
  GuardrailConfig,
  ValidationResult,
  GuardrailError,
} from './guardrails.js'

// Task coordination
export { SmithyTaskRouter } from './task-router.js'
export type {
  TaskRouterConfig,
  TaskContext,
  RoutingResult,
  TaskRouterError,
} from './task-router.js'

// Configuration schemas
export {
  BrainConfigSchema,
  BrainRequestSchema,
  BrainResponseSchema,
} from './brain.js'

export {
  GuardrailConfigSchema,
  ValidationResultSchema,
} from './guardrails.js'

export {
  TaskRouterConfigSchema,
  TaskContextSchema,
  RoutingResultSchema,
} from './task-router.js'
