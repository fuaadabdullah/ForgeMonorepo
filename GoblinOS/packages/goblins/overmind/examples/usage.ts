/**
 * 🧙‍♂️ Overmind Usage Examples
 *
 * Demonstrates real-world usage patterns for Overmind Chief Goblin Agent
 */

import {
  type AgentConfig,
  type CrewConfig,
  type DEFAULT_AGENTS,
  type RoutingStrategy,
  type Task,
  createOvermind,
  loadConfig,
} from '../src/index.js'

/**
 * Example 1: Simple Chat with Cost Tracking
 */
export async function example1_SimpleChat() {
  console.log('=== Example 1: Simple Chat ===\n')

  const overmind = createOvermind()

  // Ask a simple factual question (should route to DeepSeek for cost savings)
  const result1 = await overmind.chat('What is the capital of France?')
  console.log('Question: What is the capital of France?')
  console.log('Answer:', result1.response)
  console.log('Routed to:', result1.routing.selectedModel)
  console.log('Cost: $', result1.metrics.cost.toFixed(6))
  console.log('Latency:', result1.metrics.latency, 'ms\n')

  // Ask a complex strategic question (should route to GPT-4o)
  const result2 = await overmind.chat(
    'Design a comprehensive multi-cloud architecture for a fintech startup'
  )
  console.log('Question: Design architecture...')
  console.log('Routed to:', result2.routing.selectedModel)
  console.log('Cost: $', result2.metrics.cost.toFixed(6))
  console.log('Complexity:', result2.routing.complexity, '\n')

  // Show routing stats
  const stats = overmind.getRoutingStats()
  console.log('Routing Stats:', stats)
}

/**
 * Example 2: Quick Crew for Complex Task
 */
export async function example2_QuickCrew() {
  console.log('\n=== Example 2: Quick Crew ===\n')

  const overmind = createOvermind()

  // Complex task requiring multiple specialists
  const result = await overmind.quickCrew(
    `Analyze customer feedback from our latest product launch:
    - 500+ reviews across App Store, Google Play, and social media
    - Mixed sentiment (60% positive, 25% neutral, 15% negative)
    - Key themes: UI improvements, performance issues, feature requests

    Please:
    1. Summarize key insights
    2. Prioritize action items
    3. Draft communication plan for addressing concerns`,
    {
      roles: ['orchestrator', 'analyst', 'writer'] as unknown as Array<keyof typeof DEFAULT_AGENTS>,
      process: 'hierarchical',
    }
  )

  console.log('Crew Result:\n', result)
}

/**
 * Example 3: Custom Crew with Specific Agents
 */
export async function example3_CustomCrew() {
  console.log('\n=== Example 3: Custom Crew ===\n')

  const overmind = createOvermind()

  // Build custom crew for code review workflow
  const agentConfigs: AgentConfig[] = [
    {
      id: 'coder-1',
      name: 'Code Writer',
      role: 'coder',
      systemPrompt: 'You are a senior engineer writing production-quality TypeScript code.',
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.2,
      },
      maxRetries: 3,
      timeout: 300000,
    },
    {
      id: 'reviewer-1',
      name: 'Code Reviewer',
      role: 'reviewer',
      systemPrompt:
        'You are a meticulous code reviewer checking for bugs, style, and best practices.',
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.3,
      },
      maxRetries: 3,
      timeout: 300000,
    },
  ]

  const crewConfig: CrewConfig = {
    id: 'code-review-crew',
    name: 'Code Review Crew',
    description: 'Write and review code collaboratively',
    agents: agentConfigs,
    maxConcurrency: 2,
    process: 'sequential',
    memory: true,
  }

  // Create tasks
  const tasks: Task[] = [
    {
      id: 'task-1',
      type: 'code',
      prompt: 'Write a TypeScript function to validate email addresses with comprehensive tests',
      assignedTo: 'coder-1',
      state: 'pending',
      createdAt: new Date(),
      dependencies: [],
      priority: 10,
    },
    {
      id: 'task-2',
      type: 'review',
      prompt: 'Review the email validation code for security, performance, and edge cases',
      assignedTo: 'reviewer-1',
      state: 'pending',
      createdAt: new Date(),
      dependencies: ['task-1'], // Depends on task-1
      priority: 9,
    },
  ]

  const { results, crewId } = await overmind.runCrew(crewConfig, tasks)

  console.log('Crew ID:', crewId)
  console.log('Results:')
  for (const [taskId, result] of results) {
    console.log(`\n${taskId}:`, result)
  }

  // Check crew status
  const crews = overmind.getCrewsStatus()
  console.log('\nCrew Status:', JSON.stringify(crews, null, 2))
}

/**
 * Example 4: Failover Demonstration
 */
export async function example4_Failover() {
  console.log('\n=== Example 4: Failover Demo ===\n')

  // Create Overmind with only one provider to test failover
  const overmind = createOvermind()

  console.log('Available providers:', overmind.getAvailableProviders())

  try {
    // This should work even if primary provider fails
    const result = await overmind.chat(
      'Explain the concept of eventual consistency in distributed systems'
    )

    console.log('Response received via:', result.routing.selectedProvider)
    console.log('Failover reason:', result.routing.reason)
  } catch (error) {
    console.error('All providers failed:', error)
  }
}

/**
 * Example 5: Routing Strategy Comparison
 */
export async function example5_StrategyComparison() {
  console.log('\n=== Example 5: Strategy Comparison ===\n')

  const testQuery = 'Summarize the key benefits of microservices architecture'

  const strategies = ['cost-optimized', 'latency-optimized', 'predictive', 'cascading']

  for (const strategy of strategies) {
    const config = loadConfig()
    // Narrow to the RoutingStrategy enum to avoid `any` while preserving
    // runtime behaviour from example strings.
    config.routing.strategy = strategy as unknown as RoutingStrategy

    const overmind = createOvermind(config)
    const result = await overmind.chat(testQuery)

    console.log(`\n${strategy}:`)
    console.log('  Model:', result.routing.selectedModel)
    console.log('  Cost: $', result.metrics.cost.toFixed(6))
    console.log('  Latency:', result.metrics.latency, 'ms')
    console.log('  Reason:', result.routing.reason)
  }
}

/**
 * Example 6: Conversation with Context
 */
export async function example6_Conversation() {
  console.log('\n=== Example 6: Multi-turn Conversation ===\n')

  const overmind = createOvermind()

  // Turn 1
  const turn1 = await overmind.chat('I need help planning a product launch')
  console.log('Overmind:', turn1.response.slice(0, 200), '...\n')

  // Turn 2 - Overmind remembers context
  const turn2 = await overmind.chat('The product is a SaaS tool for developers')
  console.log('Overmind:', turn2.response.slice(0, 200), '...\n')

  // Turn 3 - Context continues
  const turn3 = await overmind.chat('What marketing channels should we focus on?')
  console.log('Overmind:', turn3.response.slice(0, 200), '...\n')

  // Reset conversation
  overmind.resetConversation()
  console.log('Conversation reset. Context cleared.')
}

// Run examples
async function main() {
  console.log('🧙‍♂️ Overmind Chief Goblin Agent - Examples\n')
  console.log('='.repeat(60), '\n')

  try {
    await example1_SimpleChat()
    // await example2_QuickCrew();
    // await example3_CustomCrew();
    // await example4_Failover();
    // await example5_StrategyComparison();
    // await example6_Conversation();

    console.log(`\n${'='.repeat(60)}`)
    console.log('✅ All examples completed!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
