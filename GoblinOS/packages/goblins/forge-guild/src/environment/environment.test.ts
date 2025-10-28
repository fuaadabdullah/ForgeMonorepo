/**
 * Environment Manager Tests
 *
 * Tests for environment loading, validation, and management.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnvironmentManager } from './index.js'
import { combinedEnvSchema } from './schema.js'

// Mock fs-extra
vi.mock('fs-extra', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn(),
}))

describe('EnvironmentManager', () => {
  let envManager: EnvironmentManager
  let mockLogger: any

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }
    envManager = new EnvironmentManager({ logger: mockLogger })

    // Reset process.env
    process.env = {}
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('loadSmithyEnv', () => {
    it('should load and validate environment variables successfully', async () => {
      // Setup
      process.env.GEMINI_API_KEY = 'test-key'
      process.env.LOG_LEVEL = 'debug'

      // Execute
      const result = await envManager.loadSmithyEnv()

      // Verify
      expect(result).toBeDefined()
      expect(result.GEMINI_API_KEY).toBe('test-key')
      expect(result.LOG_LEVEL).toBe('debug')
      expect(result.OLLAMA_BASE_URL).toBe('http://localhost:11434') // default
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Environment loaded successfully',
        expect.objectContaining({
          envPath: '.env',
          hasProjectOverrides: false,
          hasAgentOverrides: false,
        })
      )
    })

    it('should merge project and agent overrides', async () => {
      // Setup
      process.env.LOG_LEVEL = 'info'
      const projectOverrides = { PROJECT_NAME: 'test-project' }
      const agentOverrides = { AGENT_ID: 'test-agent' }

      // Execute
      const result = await envManager.loadSmithyEnv({
        projectOverrides,
        agentOverrides,
      })

      // Verify
      expect(result.PROJECT_NAME).toBe('test-project')
      expect(result.AGENT_ID).toBe('test-agent')
      expect(result.LOG_LEVEL).toBe('info') // from env
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Environment loaded successfully',
        expect.objectContaining({
          hasProjectOverrides: true,
          hasAgentOverrides: true,
        })
      )
    })

    it('should apply defaults when no environment variables are set', async () => {
      // Setup - no env vars set

      // Execute
      const result = await envManager.loadSmithyEnv()

      // Verify defaults are applied
      expect(result.OLLAMA_BASE_URL).toBe('http://localhost:11434')
      expect(result.LOG_LEVEL).toBe('info')
      expect(result.MAX_CONCURRENT_TASKS).toBe(5)
      expect(result.ENABLE_SECURITY_SCAN).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Environment loaded successfully',
        expect.any(Object)
      )
    })

    it('should handle invalid enum values with helpful error', async () => {
      // Setup
      process.env.LOG_LEVEL = 'invalid-level'

      // Execute & Verify
      await expect(envManager.loadSmithyEnv()).rejects.toThrow()

      // Should log error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load environment',
        expect.any(Object)
      )
    })

    it('should use custom env path', async () => {
      // Setup
      process.env.GEMINI_API_KEY = 'test-key'
      const customPath = '.env.test'

      // Execute
      await envManager.loadSmithyEnv({ envPath: customPath })

      // Verify
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Environment loaded successfully',
        expect.objectContaining({ envPath: customPath })
      )
    })
  })

  describe('getLoadedEnv', () => {
    it('should return loaded environment', async () => {
      // Setup
      process.env.GEMINI_API_KEY = 'test-key'
      await envManager.loadSmithyEnv()

      // Execute
      const result = envManager.getLoadedEnv()

      // Verify
      expect(result.GEMINI_API_KEY).toBe('test-key')
    })

    it('should throw if environment not loaded', () => {
      // Execute & Verify
      expect(() => envManager.getLoadedEnv()).toThrow(
        'Environment not loaded. Call loadSmithyEnv() first.'
      )
    })
  })

  describe('extractMissingVars', () => {
    it('should extract variable names from Zod error', () => {
      // Setup
      const errorMessage = 'Required at "GEMINI_API_KEY"; Required at "DEEPSEEK_API_KEY"'

      // Execute
      const result = (envManager as any).extractMissingVars(errorMessage)

      // Verify
      expect(result).toEqual(['GEMINI_API_KEY', 'DEEPSEEK_API_KEY'])
    })

    it('should return empty array for no matches', () => {
      // Execute
      const result = (envManager as any).extractMissingVars('Some other error')

      // Verify
      expect(result).toEqual([])
    })
  })

  describe('updateEnvExample', () => {
    it.skip('should add new variables to .env.example', async () => {
      // TODO: Implement when fs-extra types are resolved
      const newVars = ['NEW_VAR1', 'NEW_VAR2']

      // Execute
      await (envManager as any).updateEnvExample(newVars)

      // Verify
      expect(mockLogger.info).toHaveBeenCalledWith('Updated .env.example with new variables', {
        newVars,
      })
    })
  })

  describe('schema validation', () => {
    it('should validate correct environment data', () => {
      // Setup
      const validEnv = {
        GEMINI_API_KEY: 'test-key',
        LOG_LEVEL: 'info' as const,
        MAX_CONCURRENT_TASKS: 5,
      }

      // Execute
      const result = combinedEnvSchema.parse(validEnv)

      // Verify
      expect(result.GEMINI_API_KEY).toBe('test-key')
      expect(result.LOG_LEVEL).toBe('info')
      expect(result.MAX_CONCURRENT_TASKS).toBe(5)
    })

    it('should apply defaults for missing optional fields', () => {
      // Setup
      const minimalEnv = {}

      // Execute
      const result = combinedEnvSchema.parse(minimalEnv)

      // Verify defaults
      expect(result.OLLAMA_BASE_URL).toBe('http://localhost:11434')
      expect(result.LOG_LEVEL).toBe('info')
      expect(result.MAX_CONCURRENT_TASKS).toBe(5)
    })

    it('should reject invalid enum values', () => {
      // Setup
      const invalidEnv = {
        LOG_LEVEL: 'invalid-level',
      }

      // Execute & Verify
      expect(() => combinedEnvSchema.parse(invalidEnv)).toThrow()
    })
  })
})
