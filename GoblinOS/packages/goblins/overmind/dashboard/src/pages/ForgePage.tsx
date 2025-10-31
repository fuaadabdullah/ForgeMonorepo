import { CheckCircle, Hammer, Settings, Stethoscope, Wrench } from 'lucide-react'
import { useState } from 'react'

export default function ForgePage() {
  const [results, setResults] = useState<Record<string, string>>({})

  const runForgeGuildCommand = async (command: string) => {
    try {
      const response = await fetch(`http://localhost:3030/forge-guild/${command}`, {
        method: 'POST',
      })
      const data = await response.json()
      setResults((prev) => ({
        ...prev,
        [command]: response.ok ? '✅ Success' : `❌ Error: ${data.error}`,
      }))
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [command]: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }))
    }
  }

  const commands = [
    {
      id: 'doctor',
      name: 'Doctor',
      description: 'Run environment diagnostics',
      icon: Stethoscope,
    },
    {
      id: 'bootstrap',
      name: 'Bootstrap',
      description: 'Setup Python env and tools',
      icon: Wrench,
    },
    {
      id: 'sync-config',
      name: 'Sync Config',
      description: 'Sync .env with .env.example',
      icon: Settings,
    },
    {
      id: 'check',
      name: 'Check',
      description: 'Lint and test validation',
      icon: CheckCircle,
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hammer className="h-6 w-6" />
          Forge Guild · Dregg Ember (Forge Master)
        </h1>
        <p className="text-muted-foreground mt-1">
          Forge Master automation for bootstrapping, validation, and repo hygiene.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {commands.map((cmd) => {
          const Icon = cmd.icon
          return (
            <div key={cmd.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{cmd.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{cmd.description}</p>
              <button
                type="button"
                onClick={() => runForgeGuildCommand(cmd.id)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Run {cmd.name}
              </button>
              {results[cmd.id] && (
                <div className="mt-3 p-2 bg-muted rounded text-sm font-mono">{results[cmd.id]}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">CLI Usage</h3>
        <div className="text-sm font-mono bg-background p-3 rounded border">
          <div>pnpm forge-guild doctor</div>
          <div>pnpm forge-guild bootstrap</div>
          <div>pnpm forge-guild sync-config</div>
          <div>pnpm forge-guild check</div>
        </div>
      </div>
    </div>
  )
}
