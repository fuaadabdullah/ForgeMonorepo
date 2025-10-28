/**
 * Structured Output Examples - Complete Usage Guide
 *
 * Demonstrates structured JSON generation across all providers:
 * - Recipe generation with ingredient lists
 * - Code analysis with structured metrics
 * - Data extraction from text
 * - API response formatting
 *
 * @module structured/examples
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import {
  type JSONSchema,
  generateStructuredOutput,
  validateStructuredOutput,
} from '../structured.js'

/**
 * Recipe schema for structured cooking instructions
 */
export const recipeSchema: JSONSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Recipe title',
    },
    description: {
      type: 'string',
      description: 'Brief recipe description',
    },
    prepTime: {
      type: 'number',
      description: 'Preparation time in minutes',
      minimum: 0,
    },
    cookTime: {
      type: 'number',
      description: 'Cooking time in minutes',
      minimum: 0,
    },
    servings: {
      type: 'number',
      description: 'Number of servings',
      minimum: 1,
    },
    difficulty: {
      type: 'string',
      enum: ['easy', 'medium', 'hard'],
      description: 'Recipe difficulty level',
    },
    ingredients: {
      type: 'array',
      description: 'List of ingredients with quantities',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Ingredient name',
          },
          quantity: {
            type: 'number',
            description: 'Quantity amount',
            minimum: 0,
          },
          unit: {
            type: 'string',
            description: 'Unit of measurement',
            enum: [
              'cups',
              'tablespoons',
              'teaspoons',
              'ounces',
              'grams',
              'pounds',
              'pieces',
              'cans',
            ],
          },
        },
        required: ['name', 'quantity', 'unit'],
      },
    },
    instructions: {
      type: 'array',
      description: 'Step-by-step cooking instructions',
      items: {
        type: 'string',
        description: 'Individual cooking step',
      },
    },
    tags: {
      type: 'array',
      description: 'Recipe tags for categorization',
      items: {
        type: 'string',
      },
    },
  },
  required: ['title', 'prepTime', 'cookTime', 'servings', 'ingredients', 'instructions'],
}

/**
 * Generate a structured recipe from natural language description
 */
export async function generateRecipe(description: string) {
  console.log('=== Recipe Generation Example ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `Create a detailed recipe for: ${description}. Include preparation time, cooking time, servings, ingredients with measurements, and step-by-step instructions.`,
    },
  ]

  try {
    const response = await generateStructuredOutput({
      messages,
      schema: recipeSchema,
      temperature: 0.7, // Allow some creativity
    })

    const recipe = JSON.parse(response.content)

    // Validate the output
    const isValid = validateStructuredOutput(response.content, recipeSchema)
    console.log('✅ Schema validation:', isValid ? 'PASSED' : 'FAILED')

    console.log('📋 Generated Recipe:')
    console.log(`Title: ${recipe.title}`)
    console.log(`Description: ${recipe.description}`)
    console.log(
      `Prep: ${recipe.prepTime}min | Cook: ${recipe.cookTime}min | Servings: ${recipe.servings}`
    )
    console.log(`Difficulty: ${recipe.difficulty}`)
    console.log('\n🥕 Ingredients:')
    recipe.ingredients.forEach((ing: any, i: number) => {
      console.log(`  ${i + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`)
    })
    console.log('\n👨‍🍳 Instructions:')
    recipe.instructions.forEach((step: string, i: number) => {
      console.log(`  ${i + 1}. ${step}`)
    })

    console.log('\n🏷️ Tags:', recipe.tags?.join(', ') || 'None')

    return recipe
  } catch (error) {
    console.error(
      '❌ Recipe generation failed:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}

/**
 * Code analysis schema for structured code metrics
 */
export const codeAnalysisSchema: JSONSchema = {
  type: 'object',
  properties: {
    language: {
      type: 'string',
      description: 'Programming language detected',
    },
    complexity: {
      type: 'object',
      properties: {
        cyclomatic: {
          type: 'number',
          description: 'Cyclomatic complexity score',
          minimum: 1,
        },
        linesOfCode: {
          type: 'number',
          description: 'Total lines of code',
          minimum: 0,
        },
        functions: {
          type: 'number',
          description: 'Number of functions/methods',
          minimum: 0,
        },
        classes: {
          type: 'number',
          description: 'Number of classes',
          minimum: 0,
        },
      },
      required: ['cyclomatic', 'linesOfCode'],
    },
    quality: {
      type: 'object',
      properties: {
        maintainability: {
          type: 'string',
          enum: ['excellent', 'good', 'fair', 'poor'],
          description: 'Code maintainability rating',
        },
        testCoverage: {
          type: 'number',
          description: 'Estimated test coverage percentage',
          minimum: 0,
          maximum: 100,
        },
        documentation: {
          type: 'string',
          enum: ['excellent', 'good', 'fair', 'poor'],
          description: 'Documentation quality',
        },
      },
      required: ['maintainability'],
    },
    issues: {
      type: 'array',
      description: 'Identified code issues or improvements',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['bug', 'security', 'performance', 'maintainability', 'style'],
          },
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low', 'info'],
          },
          description: {
            type: 'string',
          },
          line: {
            type: 'number',
            description: 'Line number where issue occurs',
            minimum: 1,
          },
          suggestion: {
            type: 'string',
            description: 'Suggested fix or improvement',
          },
        },
        required: ['type', 'severity', 'description'],
      },
    },
    summary: {
      type: 'string',
      description: 'Overall code analysis summary',
    },
  },
  required: ['language', 'complexity', 'quality', 'summary'],
}

/**
 * Analyze code and generate structured metrics
 */
export async function analyzeCode(code: string, language?: string) {
  console.log('\n=== Code Analysis Example ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `Analyze this ${language || 'code'} and provide structured metrics including complexity, quality assessment, and identified issues:\n\n\`\`\`\n${code}\n\`\`\``,
    },
  ]

  try {
    const response = await generateStructuredOutput({
      messages,
      schema: codeAnalysisSchema,
      temperature: 0.1, // Low temperature for consistent analysis
    })

    const analysis = JSON.parse(response.content)

    // Validate the output
    const isValid = validateStructuredOutput(response.content, codeAnalysisSchema)
    console.log('✅ Schema validation:', isValid ? 'PASSED' : 'FAILED')

    console.log('🔍 Code Analysis Results:')
    console.log(`Language: ${analysis.language}`)
    console.log(
      `Complexity: Cyclomatic ${analysis.complexity.cyclomatic}, ${analysis.complexity.linesOfCode} LOC`
    )
    console.log(
      `Functions: ${analysis.complexity.functions}, Classes: ${analysis.complexity.classes}`
    )
    console.log(`Quality: ${analysis.quality.maintainability} maintainability`)
    if (analysis.quality.testCoverage) {
      console.log(`Test Coverage: ${analysis.quality.testCoverage}%`)
    }
    console.log(`Documentation: ${analysis.quality.documentation}`)

    if (analysis.issues && analysis.issues.length > 0) {
      console.log('\n⚠️ Issues Found:')
      analysis.issues.forEach((issue: any, i: number) => {
        console.log(
          `  ${i + 1}. ${issue.type.toUpperCase()} (${issue.severity}): ${issue.description}`
        )
        if (issue.line) console.log(`     Line ${issue.line}`)
        if (issue.suggestion) console.log(`     💡 ${issue.suggestion}`)
      })
    }

    console.log(`\n📝 Summary: ${analysis.summary}`)

    return analysis
  } catch (error) {
    console.error(
      '❌ Code analysis failed:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}

/**
 * Data extraction schema for structured information extraction
 */
export const dataExtractionSchema: JSONSchema = {
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      description: 'Named entities extracted from text',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['person', 'organization', 'location', 'date', 'money', 'percentage', 'other'],
          },
          value: {
            type: 'string',
            description: 'The extracted entity text',
          },
          confidence: {
            type: 'number',
            description: 'Confidence score (0-1)',
            minimum: 0,
            maximum: 1,
          },
        },
        required: ['type', 'value'],
      },
    },
    sentiment: {
      type: 'object',
      properties: {
        overall: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral'],
        },
        score: {
          type: 'number',
          description: 'Sentiment score (-1 to 1)',
          minimum: -1,
          maximum: 1,
        },
      },
      required: ['overall'],
    },
    categories: {
      type: 'array',
      description: 'Content categories',
      items: {
        type: 'string',
      },
    },
    keyPhrases: {
      type: 'array',
      description: 'Important phrases or keywords',
      items: {
        type: 'string',
      },
    },
    summary: {
      type: 'string',
      description: 'Brief text summary',
    },
  },
  required: ['entities', 'sentiment', 'summary'],
}

/**
 * Extract structured data from unstructured text
 */
export async function extractData(text: string) {
  console.log('\n=== Data Extraction Example ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `Extract structured information from this text. Identify entities, sentiment, categories, key phrases, and provide a summary:\n\n${text}`,
    },
  ]

  try {
    const response = await generateStructuredOutput({
      messages,
      schema: dataExtractionSchema,
      temperature: 0.1,
    })

    const extraction = JSON.parse(response.content)

    // Validate the output
    const isValid = validateStructuredOutput(response.content, dataExtractionSchema)
    console.log('✅ Schema validation:', isValid ? 'PASSED' : 'FAILED')

    console.log('📊 Data Extraction Results:')
    console.log(`Sentiment: ${extraction.sentiment.overall}`)
    if (extraction.sentiment.score) {
      console.log(`Sentiment Score: ${extraction.sentiment.score}`)
    }

    if (extraction.entities && extraction.entities.length > 0) {
      console.log('\n🏷️ Entities:')
      extraction.entities.forEach((entity: any, i: number) => {
        console.log(
          `  ${i + 1}. ${entity.type}: "${entity.value}"${entity.confidence ? ` (${Math.round(entity.confidence * 100)}% confidence)` : ''}`
        )
      })
    }

    if (extraction.categories && extraction.categories.length > 0) {
      console.log('\n📂 Categories:', extraction.categories.join(', '))
    }

    if (extraction.keyPhrases && extraction.keyPhrases.length > 0) {
      console.log('\n🔑 Key Phrases:', extraction.keyPhrases.join(', '))
    }

    console.log(`\n📝 Summary: ${extraction.summary}`)

    return extraction
  } catch (error) {
    console.error(
      '❌ Data extraction failed:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}

/**
 * API response schema for structured API responses
 */
export const apiResponseSchema: JSONSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['success', 'error', 'partial'],
      description: 'Response status',
    },
    data: {
      type: 'object',
      description: 'Response payload',
    },
    metadata: {
      type: 'object',
      properties: {
        requestId: {
          type: 'string',
          description: 'Unique request identifier',
        },
        timestamp: {
          type: 'string',
          description: 'Response timestamp (ISO 8601)',
        },
        processingTime: {
          type: 'number',
          description: 'Processing time in milliseconds',
          minimum: 0,
        },
        version: {
          type: 'string',
          description: 'API version',
        },
      },
      required: ['requestId', 'timestamp'],
    },
    errors: {
      type: 'array',
      description: 'Error details (if status is error or partial)',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
          },
          field: {
            type: 'string',
            description: 'Field that caused the error (if applicable)',
          },
        },
        required: ['code', 'message'],
      },
    },
  },
  required: ['status', 'metadata'],
}

/**
 * Generate structured API response
 */
export async function generateAPIResponse(request: string) {
  console.log('\n=== API Response Generation Example ===\n')

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `Generate a structured API response for this request: ${request}. Include proper status, data, metadata, and error handling if applicable.`,
    },
  ]

  try {
    const response = await generateStructuredOutput({
      messages,
      schema: apiResponseSchema,
      temperature: 0.1,
    })

    const apiResponse = JSON.parse(response.content)

    // Validate the output
    const isValid = validateStructuredOutput(response.content, apiResponseSchema)
    console.log('✅ Schema validation:', isValid ? 'PASSED' : 'FAILED')

    console.log('🔌 API Response:')
    console.log(`Status: ${apiResponse.status}`)
    console.log(`Request ID: ${apiResponse.metadata.requestId}`)
    console.log(`Timestamp: ${apiResponse.metadata.timestamp}`)
    if (apiResponse.metadata.processingTime) {
      console.log(`Processing Time: ${apiResponse.metadata.processingTime}ms`)
    }
    if (apiResponse.metadata.version) {
      console.log(`Version: ${apiResponse.metadata.version}`)
    }

    if (apiResponse.data) {
      console.log('📦 Data:', JSON.stringify(apiResponse.data, null, 2))
    }

    if (apiResponse.errors && apiResponse.errors.length > 0) {
      console.log('\n❌ Errors:')
      apiResponse.errors.forEach((error: any, i: number) => {
        console.log(`  ${i + 1}. ${error.code}: ${error.message}`)
        if (error.field) console.log(`     Field: ${error.field}`)
      })
    }

    return apiResponse
  } catch (error) {
    console.error(
      '❌ API response generation failed:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}

/**
 * Run all structured output examples
 */
export async function runAllExamples() {
  try {
    // Recipe generation
    await generateRecipe('a quick and healthy chicken stir-fry for 2 people')

    // Code analysis
    const sampleCode = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}

class ShoppingCart {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
  }

  getTotal() {
    return calculateTotal(this.items);
  }
}
`
    await analyzeCode(sampleCode, 'javascript')

    // Data extraction
    const sampleText =
      'Apple Inc. reported a 15% increase in quarterly revenue to $119.6 billion on January 25, 2024. The company, headquartered in Cupertino, California, attributed the growth to strong iPhone sales and services revenue. CEO Tim Cook expressed optimism about the upcoming product launches.'
    await extractData(sampleText)

    // API response
    await generateAPIResponse('GET /api/users/123 - retrieve user profile information')

    console.log('\n🎉 All structured output examples completed successfully!')
  } catch (error) {
    console.error(
      '\n💥 Example execution failed:',
      error instanceof Error ? error.message : String(error)
    )
  }
}

// Uncomment to run when executing this file directly:
// runAllExamples().catch(console.error);
