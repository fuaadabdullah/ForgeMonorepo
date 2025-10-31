/**
 * 🧠 Forge Master Brain CLI
 *
 * A command-line interface for interacting with the Forge Master Brain.
 * Allows triggering scaffolding tasks and testing brain functionality.
 *
 * @module @goblinos/forge-master/cli
 */

import { Command } from 'commander'
import { SmithyTaskRouter } from './brain/index.js'
import { createLogger } from './index.js'
import type { BrainRequest, SmithyOvermindContext } from './types.js'

const program = new Command()
const logger = createLogger('forge-master-cli')

/**
 * Mock function to simulate fetching context from Overmind.
 * In a real implementation, this would involve an API call to the Overmind service.
 */
async function getOvermindContext(taskDescription: string): Promise<SmithyOvermindContext> {
  logger.info('Fetching context from Overmind for task:', { taskDescription })
  // Mock data that Overmind might provide
  return {
    conversationHistory: [
      { role: 'user', content: 'I need a new web app' },
      { role: 'assistant', content: 'What kind of web app?' },
      { role: 'user', content: taskDescription },
    ],
    relevantMemories: [
      {
        id: 'mem-1',
        content: 'User previously created a Node.js project.',
        score: 0.9,
        type: 'project_creation',
        timestamp: new Date().toISOString(),
      },
    ],
    workingContext: {
      currentProject: 'my-awesome-app',
    },
    userPreferences: {
      preferredLanguage: 'typescript',
      style: 'functional',
    },
  }
}

program
  .name('forge-master-cli')
  .description('CLI for interacting with the Forge Master Brain system.')

program
  .command('scaffold')
  .description('Trigger a scaffolding task using context from Overmind.')
  .argument('<task>', 'The description of the scaffolding task.')
  .action(async (taskDescription: string) => {
    logger.info('Starting scaffolding task via CLI...')

    try {
      // 1. Get context from Overmind
      const overmindContext = await getOvermindContext(taskDescription)

      // 2. Construct the brain request from Overmind context
      const request: BrainRequest = {
        task: taskDescription,
        context: {
          projectType: 'nodejs', // Example, could be derived from context
          technologies: ['typescript', 'express'],
          requirements: overmindContext.relevantMemories.map((m) => m.content),
        },
      }

      // 3. Initialize and run the task router
      const router = new SmithyTaskRouter(logger, {})
      const result = await router.processTask(request, {
        taskId: `cli-${Date.now()}`,
        priority: 'high',
        timestamp: new Date(),
        tags: ['cli'],
      })

      logger.info('Scaffolding task finished.')
      console.log(JSON.stringify(result, null, 2))

      if (!result.success) {
        process.exit(1)
      }
    } catch (error) {
      logger.error('CLI command failed:', { error: (error as Error).message })
      process.exit(1)
    }
  })

program.parse(process.argv)
