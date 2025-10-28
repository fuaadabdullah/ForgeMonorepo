import { describe, expect, it } from 'vitest'
import { createForgeGuild } from '../dist/index.js'

describe('forge-guild templates smoke', () => {
  it('scaffolds default template and validates result', async () => {
    const guild = createForgeGuild()
    const result = await guild.scaffoldProject({
      name: 'test-smoke-project',
      type: 'fastapi',
      features: ['database'],
      environments: ['development'],
    })
    expect(result).toBeDefined()
    expect(result.path).toBe('./test-smoke-project')
    expect(result.files).toBeInstanceOf(Array)
    expect(result.nextSteps).toContain('Run the generated setup commands')
    expect(result.commands).toContain('cd test-smoke-project')
  }, 30000)
})
