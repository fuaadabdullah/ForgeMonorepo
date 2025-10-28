/**
 * Structured Outputs Module Index
 *
 * Re-exports all structured output functionality for easy importing.
 *
 * @module structured
 */

// Main structured output functions
export {
  generateStructuredOutput,
  validateStructuredOutput,
  type JSONSchema,
  type JSONSchemaProperty,
  type StructuredOutputRequest,
  type StructuredOutputResponse,
} from '../structured.js'

// Example schemas and functions
export {
  analyzeCode,
  apiResponseSchema,
  codeAnalysisSchema,
  dataExtractionSchema,
  extractData,
  generateAPIResponse,
  generateRecipe,
  recipeSchema,
  runAllExamples,
} from './examples.js'
