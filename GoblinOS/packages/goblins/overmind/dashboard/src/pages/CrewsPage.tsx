import { AlertCircle, CheckCircle, Clock, Users } from 'lucide-react'

export default function CrewsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-2xl font-bold">Crews</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          {/* Placeholder - Crew functionality coming in Phase 3 */}
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Crew Monitoring Coming Soon</h3>
            <p className="text-muted-foreground mb-6">
              Multi-agent crews will be available in Phase 3. This page will display:
            </p>
            <div className="grid gap-4 md:grid-cols-3 text-left">
              <div className="rounded-lg border border-border p-4">
                <Clock className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Real-time Status</h4>
                <p className="text-sm text-muted-foreground">
                  Live updates on crew task execution via WebSocket
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Task Progress</h4>
                <p className="text-sm text-muted-foreground">
                  Track individual agent contributions and completion status
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <AlertCircle className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Error Handling</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor failures and automatic retry mechanisms
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
