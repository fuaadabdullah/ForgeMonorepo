/**
 * 👥 Multi-Agent Crew System
 *
 * Implements CrewAI-inspired multi-agent coordination where Overmind
 * orchestrates specialized goblin agents for complex tasks.
 *
 * Features:
 * - Agent spawning and lifecycle management
 * - Task delegation and dependency resolution
 * - Sequential, parallel, and hierarchical execution modes
 * - Shared memory and context passing
 *
 * @module @goblinos/overmind/crew
 */

import type { LLMClientFactory } from '../clients/index.js'
import { executeWithRetry } from '../clients/index.js'
import type { AgentConfig, AgentRole, AgentState, CrewConfig, Message, Task } from '../types.js'
import { AgentRole as Role, AgentState as State } from '../types.js'

/**
 * Agent instance with state and execution context
 */
export class Agent {
  public id: string
  public name: string
  public role: AgentRole
  public state: AgentState
  public systemPrompt: string
  private config: AgentConfig
  private clientFactory: LLMClientFactory
  private conversationHistory: Message[]

  constructor(config: AgentConfig, clientFactory: LLMClientFactory) {
    this.id = config.id
    this.name = config.name
    this.role = config.role
    this.state = State.IDLE
    this.systemPrompt = config.systemPrompt
    this.config = config
    this.clientFactory = clientFactory
    this.conversationHistory = [
      {
        role: 'system',
        content: this.systemPrompt,
      },
    ]
  }

  /**
   * Execute a task assigned to this agent
   */
  async execute(task: Task): Promise<string> {
    this.state = State.THINKING

    try {
      // Build messages with task context
      const messages: Message[] = [
        ...this.conversationHistory,
        {
          role: 'user',
          content: this.buildTaskPrompt(task),
        },
      ]

      // Get LLM client
      const client = this.clientFactory.getClient(this.config.model.provider)

      // Execute with retry
      this.state = State.EXECUTING
      const response = await executeWithRetry(client, messages, this.config.model.model, {
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
      })

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: this.buildTaskPrompt(task) },
        { role: 'assistant', content: response.content }
      )

      // Keep history manageable (last 10 messages)
      if (this.conversationHistory.length > 11) {
        this.conversationHistory = [
          this.conversationHistory[0], // Keep system prompt
          ...this.conversationHistory.slice(-10),
        ]
      }

      this.state = State.COMPLETED
      return response.content
    } catch (error) {
      this.state = State.FAILED
      throw new Error(`Agent ${this.name} (${this.role}) failed: ${(error as Error).message}`)
    }
  }

  /**
   * Build prompt for task with context
   */
  private buildTaskPrompt(task: Task): string {
    let prompt = `**Task ID:** ${task.id}\n`
    prompt += `**Type:** ${task.type}\n`
    prompt += `**Priority:** ${task.priority}/10\n\n`
    prompt += `**Instructions:**\n${task.prompt}\n\n`

    if (task.context && Object.keys(task.context).length > 0) {
      prompt += `**Context:**\n${JSON.stringify(task.context, null, 2)}\n\n`
    }

    if (task.dependencies.length > 0) {
      prompt += `**Dependencies:** This task depends on: ${task.dependencies.join(', ')}\n\n`
    }

    prompt += `Please complete this task according to your role as ${this.role}. `
    prompt += 'Provide your response in a clear, actionable format. 🎯'

    return prompt
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state = State.IDLE
    this.conversationHistory = [
      {
        role: 'system',
        content: this.systemPrompt,
      },
    ]
  }

  /**
   * Get agent status
   */
  getStatus(): {
    id: string
    name: string
    role: AgentRole
    state: AgentState
    historyLength: number
  } {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      state: this.state,
      historyLength: this.conversationHistory.length,
    }
  }
}

/**
 * Crew: manages a team of agents working on tasks
 */
export class Crew {
  public id: string
  public name: string
  public description: string
  private config: CrewConfig
  private agents: Map<string, Agent>
  private tasks: Map<string, Task>
  private clientFactory: LLMClientFactory

  constructor(config: CrewConfig, clientFactory: LLMClientFactory) {
    this.id = config.id
    this.name = config.name
    this.description = config.description
    this.config = config
    this.clientFactory = clientFactory
    this.agents = new Map()
    this.tasks = new Map()

    // Initialize agents
    for (const agentConfig of config.agents) {
      const agent = new Agent(agentConfig, clientFactory)
      this.agents.set(agent.id, agent)
    }
  }

  /**
   * Add a task to the crew
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, task)
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id)
  }

  /**
   * Get agent by role
   */
  getAgentByRole(role: AgentRole): Agent | undefined {
    return Array.from(this.agents.values()).find((a) => a.role === role)
  }

  /**
   * Execute all tasks according to process mode
   */
  async run(): Promise<Map<string, unknown>> {
    // results is produced by specific run* methods

    switch (this.config.process) {
      case 'sequential':
        return await this.runSequential()
      case 'parallel':
        return await this.runParallel()
      case 'hierarchical':
        return await this.runHierarchical()
      default:
        throw new Error(`Unknown process mode: ${this.config.process}`)
    }
  }

  /**
   * Run tasks sequentially in order
   */
  private async runSequential(): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>()
    const sortedTasks = Array.from(this.tasks.values()).sort((a, b) => b.priority - a.priority)

    for (const task of sortedTasks) {
      if (task.state === 'completed') continue

      // Check dependencies
      const depsCompleted = task.dependencies.every((depId: string) => {
        const dep = this.tasks.get(depId)
        return dep?.state === 'completed'
      })

      if (!depsCompleted) {
        throw new Error(`Task ${task.id} has unmet dependencies: ${task.dependencies.join(', ')}`)
      }

      // Find agent for task
      const agent = task.assignedTo ? this.agents.get(task.assignedTo) : this.findBestAgent(task)

      if (!agent) {
        throw new Error(`No suitable agent found for task ${task.id}`)
      }

      // Execute task
      task.state = 'in-progress'
      task.startedAt = new Date()

      try {
        const result = await agent.execute(task)
        task.state = 'completed'
        task.completedAt = new Date()
        task.result = result
        results.set(task.id, result)
      } catch (error) {
        task.state = 'failed'
        task.error = (error as Error).message
        throw error
      }
    }

    return results
  }

  /**
   * Run independent tasks in parallel
   */
  private async runParallel(): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>()
    const tasks = Array.from(this.tasks.values()).filter(
      (t) => t.state !== 'completed' && t.dependencies.length === 0
    )

    // Limit concurrency
    const concurrency = this.config.maxConcurrency
    const batches: Task[][] = []

    for (let i = 0; i < tasks.length; i += concurrency) {
      batches.push(tasks.slice(i, i + concurrency))
    }

    for (const batch of batches) {
      const promises = batch.map(async (task) => {
        const agent = task.assignedTo ? this.agents.get(task.assignedTo) : this.findBestAgent(task)

        if (!agent) {
          throw new Error(`No suitable agent for task ${task.id}`)
        }

        task.state = 'in-progress'
        task.startedAt = new Date()

        try {
          const result = await agent.execute(task)
          task.state = 'completed'
          task.completedAt = new Date()
          task.result = result
          return { taskId: task.id, result }
        } catch (error) {
          task.state = 'failed'
          task.error = (error as Error).message
          throw error
        }
      })

      const batchResults = await Promise.all(promises)
      for (const { taskId, result } of batchResults) {
        results.set(taskId, result)
      }
    }

    return results
  }

  /**
   * Run tasks hierarchically: Overmind delegates to specialists
   */
  private async runHierarchical(): Promise<Map<string, unknown>> {
    // Find Overmind (orchestrator)
    const overmind = this.getAgentByRole(Role.ORCHESTRATOR)

    if (!overmind) {
      throw new Error('Hierarchical mode requires an ORCHESTRATOR agent')
    }

    // Overmind plans and delegates
    const results = new Map<string, unknown>()

    for (const task of this.tasks.values()) {
      if (task.state === 'completed') continue

      // Overmind decides how to handle task
      const delegationPlan = await this.createDelegationPlan(overmind, task)

      // Execute subtasks
      for (const subtask of delegationPlan.subtasks) {
        const agent = this.agents.get(subtask.assignedTo!)
        if (!agent) continue

        try {
          const result = await agent.execute(subtask)
          results.set(subtask.id, result)
        } catch (error) {
          console.error(`Subtask ${subtask.id} failed:`, error)
        }
      }

      task.state = 'completed'
      task.completedAt = new Date()
    }

    return results
  }

  /**
   * Overmind creates delegation plan for complex task
   */
  private async createDelegationPlan(overmind: Agent, task: Task): Promise<{ subtasks: Task[] }> {
    // Ask Overmind to break down the task
    const planningPrompt = `
You are Overmind 🧙‍♂️, orchestrating a crew of specialist agents.

**Main Task:** ${task.prompt}

**Available Agents:**
${Array.from(this.agents.values())
  .map((a) => `- ${a.name} (${a.role}): ${a.systemPrompt.slice(0, 100)}...`)
  .join('\n')}

Please break this task into subtasks and assign each to the most suitable agent.
Respond in JSON format:
{
  "subtasks": [
    {"id": "subtask-1", "assignedTo": "agent-id", "prompt": "specific instructions"}
  ]
}
`

    const planTask: Task = {
      id: `plan-${task.id}`,
      type: 'planning',
      prompt: planningPrompt,
      state: 'pending',
      createdAt: new Date(),
      dependencies: [],
      priority: 10,
    }

    const planResponse = await overmind.execute(planTask)

    // Parse JSON response
    try {
      const parsed = JSON.parse(planResponse)
      const subtasks: Task[] = (Array.isArray(parsed.subtasks) ? parsed.subtasks : []).map(
        (st: unknown, idx: number) => {
          const s = st && typeof st === 'object' ? (st as Record<string, unknown>) : {}
          const id = typeof s.id === 'string' ? String(s.id) : `${task.id}-subtask-${idx}`
          const prompt = typeof s.prompt === 'string' ? String(s.prompt) : ''
          const assignedTo = typeof s.assignedTo === 'string' ? String(s.assignedTo) : undefined

          return {
            id,
            type: task.type,
            prompt,
            assignedTo,
            state: 'pending' as const,
            createdAt: new Date(),
            dependencies: [],
            priority: task.priority,
          } as Task
        }
      )

      return { subtasks }
    } catch (_error) {
      // Fallback: assign to first available agent
      return {
        subtasks: [
          {
            ...task,
            id: `${task.id}-fallback`,
            assignedTo: Array.from(this.agents.keys())[0],
          },
        ],
      }
    }
  }

  /**
   * Find best agent for a task (simple heuristic)
   */
  private findBestAgent(task: Task): Agent | undefined {
    // Try to match by task type to agent role
    const roleMap: Record<string, AgentRole> = {
      research: Role.RESEARCHER,
      analysis: Role.ANALYST,
      code: Role.CODER,
      writing: Role.WRITER,
      review: Role.REVIEWER,
      environment: Role.ENVIRONMENT_ENGINEER,
      bootstrap: Role.ENVIRONMENT_ENGINEER,
      hygiene: Role.ENVIRONMENT_ENGINEER,
      config: Role.ENVIRONMENT_ENGINEER,
    }

    const preferredRole = roleMap[task.type]
    if (preferredRole) {
      const agent = this.getAgentByRole(preferredRole)
      if (agent && agent.state !== State.FAILED) return agent
    }

    // Fallback: first idle agent
    return Array.from(this.agents.values()).find((a) => a.state === State.IDLE)
  }

  /**
   * Get crew status
   */
  getStatus(): {
    id: string
    name: string
    agents: ReturnType<Agent['getStatus']>[]
    tasks: {
      total: number
      pending: number
      inProgress: number
      completed: number
      failed: number
    }
  } {
    const tasks = Array.from(this.tasks.values())

    return {
      id: this.id,
      name: this.name,
      agents: Array.from(this.agents.values()).map((a) => a.getStatus()),
      tasks: {
        total: tasks.length,
        pending: tasks.filter((t) => t.state === 'pending').length,
        inProgress: tasks.filter((t) => t.state === 'in-progress').length,
        completed: tasks.filter((t) => t.state === 'completed').length,
        failed: tasks.filter((t) => t.state === 'failed').length,
      },
    }
  }
}

/**
 * Default agent templates for quick crew setup
 */
export const DEFAULT_AGENTS: Record<AgentRole, Omit<AgentConfig, 'id'>> = {
  [Role.ORCHESTRATOR]: {
    name: 'Overmind',
    role: Role.ORCHESTRATOR,
    systemPrompt:
      'You are Overmind 🧙‍♂️, the wise Chief Goblin Agent. You coordinate specialist agents, break down complex tasks, and provide strategic guidance with warmth and wit.',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
    },
    maxRetries: 3,
    timeout: 300000,
  },
  [Role.RESEARCHER]: {
    name: 'Research Goblin',
    role: Role.RESEARCHER,
    systemPrompt:
      'You are a Research Goblin 📚, expert at gathering information, finding sources, and synthesizing knowledge. Be thorough and cite sources.',
    model: {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      temperature: 0.5,
    },
    maxRetries: 3,
    timeout: 300000,
  },
  [Role.ANALYST]: {
    name: 'Analyst Goblin',
    role: Role.ANALYST,
    systemPrompt:
      'You are an Analyst Goblin 📊, skilled at data analysis, pattern recognition, and deriving insights. Be precise and data-driven.',
    model: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      temperature: 0.3,
    },
    maxRetries: 3,
    timeout: 300000,
  },
  [Role.CODER]: {
    name: 'Coder Goblin',
    role: Role.CODER,
    systemPrompt:
      'You are a Coder Goblin 💻, expert at writing clean, efficient code. Follow best practices and explain your implementations.',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.2,
    },
    maxRetries: 3,
    timeout: 300000,
  },
  [Role.WRITER]: {
    name: 'Writer Goblin',
    role: Role.WRITER,
    systemPrompt:
      'You are a Writer Goblin ✍️, skilled at crafting clear, engaging content. Write with style and clarity.',
    model: {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      temperature: 0.8,
    },
    maxRetries: 3,
    timeout: 300000,
  },
  [Role.REVIEWER]: {
    name: 'Reviewer Goblin',
    role: Role.REVIEWER,
    systemPrompt:
      'You are a Reviewer Goblin 🔍, meticulous about quality. Check for errors, suggest improvements, and ensure excellence.',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.3,
    },
    maxRetries: 3,
    timeout: 300000,
  },
  [Role.SPECIALIST]: {
    name: 'Specialist Goblin',
    role: Role.SPECIALIST,
    systemPrompt:
      'You are a Specialist Goblin 🎯, expert in your domain. Provide deep, authoritative knowledge on specialized topics.',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.5,
    },
    maxRetries: 3,
    timeout: 300000,
  },
  [Role.ENVIRONMENT_ENGINEER]: {
    name: 'Smithy',
    role: Role.ENVIRONMENT_ENGINEER,
    systemPrompt:
      'You are Smithy 🛠️, the Forge Guild environment goblin. You bootstrap development environments, enforce repo hygiene, and automate CI/CD flows. You can run diagnostics, setup Python environments with uv, install dependencies, configure pre-commit hooks, sync configuration files, and execute linting/testing pipelines. Always prioritize deterministic, reproducible setups.',
    model: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      temperature: 0.2,
    },
    maxRetries: 3,
    timeout: 300000,
  },
}
