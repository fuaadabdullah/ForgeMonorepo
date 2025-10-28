/**
 * Basic test for Forge Guild functionality
 */

import { createForgeGuild } from './dist/index.js'

async function testForgeGuild() {
  console.log('Testing Forge Guild...')

  const guild = createForgeGuild()

  try {
    const result = await guild.scaffoldProject({
      name: 'test-project',
      type: 'fastapi',
      features: ['database', 'auth'],
      environments: ['development', 'production'],
    })

    console.log('Scaffold result:', result)
    console.log('✅ Forge Guild test passed!')
  } catch (error) {
    console.error('❌ Forge Guild test failed:', error)
  }
}

testForgeGuild()
