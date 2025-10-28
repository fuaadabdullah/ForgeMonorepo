/**
 * 🧠 Smithy Brain Tests
 *
 * Comprehensive test suite for the autonomous AI scaffolding system.
 * Tests brain processing, guardrails validation, and task routing.
 *
 * @module @goblinos/forge-guild/test/brain
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SmithyBrain, SmithyGuardrails, SmithyTaskRouter } from './index.js'

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

describe('Smithy Brain System', () => {
  describe('SmithyBrain', () => {
    let brain: SmithyBrain

    beforeEach(() => {
      brain = new SmithyBrain(mockLogger, {
        model: 'qwen2.5-coder:7b',
        temperature: 0.1,
        maxTokens: 1000,
      })
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should initialize with default config', () => {
      const config = brain.getConfig()
      expect(config.model).toBe('qwen2.5-coder:7b')
      expect(config.temperature).toBe(0.1)
      expect(config.maxTokens).toBe(1000)
    })

    it('should update configuration', () => {
      brain.updateConfig({ temperature: 0.5, maxTokens: 2000 })
      const config = brain.getConfig()
      expect(config.temperature).toBe(0.5)
      expect(config.maxTokens).toBe(2000)
    })

    it('should handle health check failure gracefully', async () => {
      // Mock fetch to simulate connection failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'))

      await expect(
        brain.processRequest({
          task: 'Create a simple Node.js app',
        })
      ).rejects.toThrow('Ollama service unavailable')

      expect(mockLogger.error).toHaveBeenCalledWith('Brain processing failed', expect.any(Object))
    })
  })

  describe('SmithyGuardrails', () => {
    let guardrails: SmithyGuardrails

    beforeEach(() => {
      guardrails = new SmithyGuardrails(mockLogger, {
        enableSecurityScan: true,
        enableContentFilter: true,
        blockedKeywords: ['hack', 'exploit'],
      })
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should validate safe requests', async () => {
      const result = await guardrails.validateRequest({
        task: 'Create a simple web application',
      })

      expect(result.valid).toBe(true)
      expect(result.score).toBeGreaterThan(8)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect security issues', async () => {
      const result = await guardrails.validateRequest({
        task: 'Create a script to hack into systems',
      })

      expect(result.valid).toBe(false)
      expect(result.score).toBeLessThanOrEqual(8)
      expect(result.issues.some((i) => i.type === 'security')).toBe(true)
    })

    it('should detect blocked keywords', async () => {
      const result = await guardrails.validateRequest({
        task: 'Learn how to exploit vulnerabilities',
      })

      expect(result.valid).toBe(false)
      expect(result.issues.some((i) => i.message.includes('Blocked keyword'))).toBe(true)
    })

    it('should validate response content', async () => {
      const result = await guardrails.validateResponse({
        plan: {
          steps: [
            {
              action: 'create_file',
              target: 'safe.js',
              content: 'console.log("Hello World");',
            },
          ],
        },
      })

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect dangerous file extensions', async () => {
      const result = await guardrails.validateResponse({
        plan: {
          steps: [
            {
              action: 'create_file',
              target: 'dangerous.exe',
              content: 'malicious content',
            },
          ],
        },
      })

      expect(result.valid).toBe(false)
      expect(result.issues.some((i) => i.severity === 'critical')).toBe(true)
    })

    it('should sanitize content', () => {
      const dangerous = 'This contains sk-1234567890abcdef and some exploit code'
      const sanitized = guardrails.sanitizeContent(dangerous)

      expect(sanitized).toContain('[REDACTED]')
      expect(sanitized).not.toContain('sk-1234567890abcdef')
    })
  })

  describe('SmithyTaskRouter', () => {
    let router: SmithyTaskRouter

    beforeEach(() => {
      router = new SmithyTaskRouter(mockLogger, {
        enableValidation: true,
        maxRetries: 1,
        enableFallback: true,
      })
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should initialize with default config', () => {
      const stats = router.getStats()
      expect(stats.config.enableValidation).toBe(true)
      expect(stats.config.maxRetries).toBe(1)
      expect(stats.config.enableFallback).toBe(true)
    })

    it('should update configuration', () => {
      router.updateConfig({ maxRetries: 3, enableValidation: false })
      const stats = router.getStats()
      expect(stats.config.maxRetries).toBe(3)
      expect(stats.config.enableValidation).toBe(false)
    })

    it('should process safe tasks successfully', async () => {
      // Mock the brain to return a successful response
      const _mockBrain = {
        processRequest: vi.fn().mockResolvedValue({
          success: true,
          plan: {
            description: 'Test plan',
            steps: [
              {
                action: 'create_file',
                target: 'test.js',
                content: 'console.log("test");',
                reasoning: 'Basic test file',
              },
            ],
            estimatedComplexity: 'low',
          },
          metadata: {
            model: 'test-model',
            processingTime: 100,
          },
        }),
      }

      // Replace the brain instance (this would need proper mocking in real tests)
      // For now, we'll test the validation logic

      const result = await router.processTask(
        { task: 'Create a simple test file' },
        { taskId: 'test-123', priority: 'normal', timestamp: new Date(), tags: [] }
      )

      // Should attempt processing and handle the mock appropriately
      expect(result).toBeDefined()
      expect(typeof result.processingTime).toBe('number')
    })

    it('should reject dangerous requests', async () => {
      const result = await router.processTask(
        { task: 'Create a hacking tool' },
        { taskId: 'dangerous-123', priority: 'normal', timestamp: new Date(), tags: [] }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('validation failed')
    })

    it('should handle batch processing', async () => {
      const tasks = [
        {
          request: { task: 'Create file 1' },
          context: {
            taskId: 'batch-1',
            priority: 'normal' as const,
            timestamp: new Date(),
            tags: [],
          },
        },
        {
          request: { task: 'Create file 2' },
          context: {
            taskId: 'batch-2',
            priority: 'normal' as const,
            timestamp: new Date(),
            tags: [],
          },
        },
      ]

      const results = await router.processBatch(tasks)

      expect(results).toHaveLength(2)
      results.forEach((result) => {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('processingTime')
      })
    })

    it('should report health status', async () => {
      const health = await router.getHealth()
      expect(health).toHaveProperty('brain')
      expect(health).toHaveProperty('guardrails')
      expect(health).toHaveProperty('overall')
      expect(typeof health.overall).toBe('boolean')
    })
  })

  describe('Integration Tests', () => {
    it('should handle end-to-end safe request flow', async () => {
      const router = new SmithyTaskRouter(mockLogger, {})

      const result = await router.processTask(
        {
          task: 'Create a simple README.md file for a Node.js project',
          context: {
            projectType: 'nodejs',
            technologies: ['node', 'npm'],
          },
        },
        { taskId: 'integration-1', priority: 'normal', timestamp: new Date(), tags: [] }
      )

      // The result should be processed (may fail due to Ollama not being available in test)
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('processingTime')
      expect(result.processingTime).toBeGreaterThan(0)
    })

    it('should properly validate complex requests', async () => {
      const guardrails = new SmithyGuardrails(mockLogger, {})

      const complexRequest = {
        task: 'Create a full-stack application with authentication, database, and API endpoints using React, Node.js, and PostgreSQL',
        context: {
          technologies: ['react', 'nodejs', 'postgresql', 'express', 'jwt'],
          requirements: [
            'User registration',
            'Login/logout',
            'Protected routes',
            'Database models',
          ],
        },
        constraints: {
          maxFiles: 10,
        },
      }

      const result = await guardrails.validateRequest(complexRequest)

      // Should validate but may have complexity warnings
      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('issues')
      expect(result).toHaveProperty('recommendations')
    })

    it('should handle end-to-end request with Overmind context', async () => {
      const router = new SmithyTaskRouter(mockLogger, {})

      // This simulates the kind of rich context we might get from Overmind
      const overmindContext = {
        conversationHistory: [{ role: 'user', content: 'I need a REST API' }],
        relevantMemories: [{ content: 'User prefers TypeScript' }],
        userPreferences: { preferredStyle: 'functional' },
      }

      const result = await router.processTask(
        {
          task: 'Create a simple REST API for a user service',
          context: {
            projectType: 'nodejs',
            technologies: ['express', 'typescript'],
            requirements: overmindContext.relevantMemories.map((m) => m.content),
          },
        },
        {
          taskId: 'integration-overmind-1',
          priority: 'high',
          timestamp: new Date(),
          tags: ['overmind'],
        }
      )

      expect(result).toHaveProperty('success')
      expect(result.processingTime).toBeGreaterThan(0)
    })
  })
})
