import { Command } from 'commander'
import { loadPlugins } from './plugins.js'

export default async function run(argv: string[] = process.argv): Promise<void> {
  const program = new Command()
  program.name('goblin').description('GoblinOS CLI').version('0.1.0')

  program
    .command('run')
    .description('Run all enabled goblins')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (opts: { verbose?: boolean }) => {
      const plugins = await loadPlugins()
      let exit = 0
      for (const p of plugins) {
        const rc = await p.run({ verbose: opts.verbose })
        exit = exit || rc
      }
      process.exit(exit)
    })

  program
    .command('scaffold <type>')
    .description('Scaffold a new project or component')
    .option('-n, --name <name>', 'Name of the project/component')
    .action(async (type: string, opts: { name?: string }) => {
      console.log(`Scaffolding ${type} named ${opts.name || 'unnamed'}`)
      // TODO: Implement scaffolding logic
    })

  program
    .command('ci')
    .description('Generate CI/CD pipelines')
    .option('-p, --platform <platform>', 'CI platform (github, gitlab, etc)', 'github')
    .action(async (opts: { platform?: string }) => {
      console.log(`Generating ${opts.platform} CI pipeline`)
      // TODO: Implement CI generation
    })

  program
    .command('health')
    .description('Check workspace health')
    .action(async () => {
      const plugins = await loadPlugins()
      console.log('Checking workspace health...')
      for (const p of plugins) {
        if (p.health) {
          const status = await p.health()
          console.log(`• ${p.name}: ${status}`)
        }

        // Parse the provided argv instead of process.argv to make the
        // function testable and explicit.
        await program.parseAsync(argv)
      }
    })
}

if (import.meta.url === `file://${process.argv[1]}`) run(process.argv)
