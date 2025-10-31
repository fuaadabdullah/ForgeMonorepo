/**
 * @goblinos/forge-master
 *
 * Tests for CI/CD Pipeline Manager
 */

import { describe, expect, it, vi } from 'vitest'

// Mock fs-extra and js-yaml since they're not resolving
vi.mock('fs-extra', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

vi.mock('js-yaml', () => ({
  dump: vi.fn((data) => JSON.stringify(data)),
}))

// Import after mocking
import { CICDPipelineManager } from './index.js'

describe('CICDPipelineManager', () => {
  let manager: CICDPipelineManager

  beforeEach(() => {
    manager = new CICDPipelineManager()
  })

  describe('createPipeline', () => {
    it('should create GitHub Actions workflow', async () => {
      const config = {
        provider: 'github-actions' as const,
        name: 'test-pipeline',
        triggers: ['push', 'pull_request'],
        environments: ['development', 'production'],
        jobs: {
          build: {
            runsOn: 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Test', run: 'npm test' },
            ],
          },
        },
      }

      const result = await manager.createPipeline(config)

      expect(result.files).toContain('.github/workflows/test-pipeline.yml')
      expect(result.workflows).toContain('test-pipeline')
      expect(result.triggers).toEqual(['push', 'pull_request'])
    })

    it('should create GitLab CI pipeline', async () => {
      const config = {
        provider: 'gitlab-ci' as const,
        name: 'test-pipeline',
        triggers: ['push'],
        environments: ['development'],
        jobs: {
          build: {
            runsOn: 'ubuntu:latest',
            steps: [{ name: 'Test', run: 'npm test' }],
          },
        },
      }

      const result = await manager.createPipeline(config)

      expect(result.files).toContain('.gitlab-ci.yml')
      expect(result.workflows).toContain('test-pipeline')
    })

    it('should create Jenkins pipeline', async () => {
      const config = {
        provider: 'jenkins' as const,
        name: 'test-pipeline',
        triggers: ['push'],
        environments: ['development'],
        jobs: {
          build: {
            runsOn: 'any',
            steps: [{ name: 'Test', run: 'npm test' }],
          },
        },
      }

      const result = await manager.createPipeline(config)

      expect(result.files).toContain('Jenkinsfile')
      expect(result.workflows).toContain('test-pipeline')
    })
  })

  describe('generateGitOps', () => {
    it('should generate GitOps manifests', async () => {
      const config = {
        basePath: 'base',
        overlays: ['development', 'production'],
        images: { app: 'myapp:latest' },
        namespace: 'default',
      }

      const result = await manager.generateGitOps(config)

      expect(result.files.length).toBeGreaterThan(0)
      expect(result.commands.length).toBeGreaterThan(0)
      expect(result.commands).toContain('kubectl apply -k k8s/base/')
    })
  })
})
