import { GuildRegistryError, loadRegistrySync } from '@goblinos/registry'
import { createLogger, resolveRepoPath, runCommand } from '@goblinos/shared'
import { Command } from 'commander'

const logger = createLogger({ name: 'crafters-guild' })
const repoRoot = resolveRepoPath()

const registry = loadRegistrySync()
const guild = (() => {
  const value = registry.guildMap.get('crafters')
  if (!value) {
    throw new GuildRegistryError('Crafters guild definition not found in goblins.yaml')
  }
  return value
})()

function getTool(toolId: string) {
  const tool = guild.toolMap.get(toolId)
  if (!tool) {
    throw new GuildRegistryError(`Tool ${toolId} is not registered for the Crafters guild`)
  }
  return tool
}

function getArgument(toolId: string, name: string) {
  const tool = getTool(toolId)
  return tool.args?.find((arg) => arg.name === name)
}

function resolveArgumentValue(toolId: string, name: string, provided?: string): string | undefined {
  const arg = getArgument(toolId, name)
  if (!arg) return provided

  const value = provided ?? (typeof arg.default === 'string' ? arg.default : undefined)

  if (arg.type === 'enum' && value && arg.options && !arg.options.includes(value)) {
    throw new GuildRegistryError(
      `Value "${value}" is not valid for ${toolId}:${name}. Expected one of: ${arg.options.join(', ')}`
    )
  }

  if ((arg.required ?? false) && !value) {
    throw new GuildRegistryError(
      `Argument ${name} is required for ${toolId}.${arg.options ? ` Allowed values: ${arg.options.join(', ')}` : ''}`
    )
  }

  return value
}

function splitCommand(command: string): { cmd: string; baseArgs: string[] } {
  const segments = command.split(' ').filter(Boolean)
  const baseCommand = segments[0]
  if (!baseCommand) {
    throw new GuildRegistryError('Crafters guild tool command is empty')
  }
  const baseArgs = segments.slice(1)
  return { cmd: baseCommand, baseArgs }
}

async function invokeTool(toolId: string, extraArgs: string[] = [], label?: string) {
  const tool = getTool(toolId)
  const { cmd, baseArgs } = splitCommand(tool.command as string)
  await runCommand(cmd, [...baseArgs, ...extraArgs], {
    cwd: repoRoot,
    logger,
    label: label ?? tool.name,
  })
}

export function createProgram() {
  const program = new Command()

  program
    .name('crafters-guild')
    .description('Crafters Guild CLI — UI systems, backend sockets, and deployment runbooks')
    .showHelpAfterError()

  program
    .command('ui:guard')
    .description('Run UI guardrails (pnpm presence check via ensure-pnpm.sh)')
    .action(async () => {
      await invokeTool('ensure-pnpm', [], 'UI pnpm guard')
    })

  program
    .command('api:config')
    .description('Launch backend configuration wizard (config_backend.sh)')
    .action(async () => {
      await invokeTool('config-backend', [], 'Backend configuration wizard')
    })

  program
    .command('api:deploy [target]')
    .description('Deploy ForgeTM backend with migrations (deploy_backend.sh)')
    .action(async (target: string | undefined) => {
      const mode = resolveArgumentValue('deploy-backend', 'target', target) ?? 'local'
      await invokeTool('deploy-backend', [mode], `Backend deploy (${mode})`)
    })

  program
    .command('api:maintain <task>')
    .description('Run backend maintenance checklist (maintain_backend.sh <task>)')
    .action(async (task: string) => {
      const resolvedTask = resolveArgumentValue('maintain-backend', 'task', task) ?? task
      await invokeTool('maintain-backend', [resolvedTask], `Backend maintenance (${resolvedTask})`)
    })

  program
    .command('tools')
    .description('List Crafters guild toolbelt assignments')
    .action(() => {
      for (const tool of guild.toolbelt) {
        logger.info(
          {
            toolId: tool.id,
            command: tool.command,
            owner: tool.owner,
            args: tool.args,
          },
          tool.summary
        )
      }
    })

  return program
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createProgram()
  try {
    await program.parseAsync(argv)
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Crafters guild command failed')
    process.exit(1)
  }
}
