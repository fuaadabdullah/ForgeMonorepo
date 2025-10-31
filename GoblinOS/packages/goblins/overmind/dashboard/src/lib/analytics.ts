const ANALYTICS_KEY = 'overmind:analytics:v1'
const RECENT_COMMANDS_KEY = 'overmind:recent-commands:v1'

export async function shipTelemetry() {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY)
    if (!raw) return

    const data = JSON.parse(raw)
    const response = await fetch('/v1/analytics/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      // Clear local storage after successful upload
      localStorage.removeItem(ANALYTICS_KEY)
    }
  } catch (e) {
    console.error('Failed to ship telemetry', e)
  }
}

export function recordCommandUsage(commandId: string) {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY)
    const data = raw ? JSON.parse(raw) : { commands: {} }
    data.commands[commandId] = (data.commands[commandId] || 0) + 1
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data))

    const recentRaw = localStorage.getItem(RECENT_COMMANDS_KEY)
    const recent = recentRaw ? JSON.parse(recentRaw) : []
    // push to front, de-dup
    const newList = [commandId, ...recent.filter((c: string) => c !== commandId)].slice(0, 10)
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(newList))
  } catch {
    // ignore
  }
}

export function getRecentCommands(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
