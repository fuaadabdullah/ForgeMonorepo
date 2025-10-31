import { useMemory } from '@/hooks/useMemory'
import { Brain, Database, FileText, Users } from 'lucide-react'
import type { ElementType } from 'react'

export default function MemoryPage() {
  const { stats, isLoading, isFallback } = useMemory()

  if (isLoading || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading memory stats...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-2xl font-bold">Memory</h2>
      </header>

      {isFallback && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            Offline snapshot shown — live memory service is currently unreachable.
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Memory Stats */}
          <div className="grid gap-6 md:grid-cols-3">
            <StatCard
              icon={Brain}
              title="Short-term Memory"
              value={stats.shortTerm.count}
              subtitle="Recent messages"
              color="text-blue-500"
            />
            <StatCard
              icon={FileText}
              title="Working Memory"
              value={stats.working.count}
              subtitle={`${stats.working.utilizationPercent.toFixed(0)}% utilization`}
              color="text-purple-500"
            />
            <StatCard
              icon={Database}
              title="Long-term Memory"
              value={stats.longTerm.memories}
              subtitle="Stored facts"
              color="text-green-500"
            />
          </div>

          {/* Detailed Stats */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="text-lg font-semibold">Memory Details</h3>
            </div>
            <div className="divide-y divide-border">
              <DetailRow label="Short-term Messages" value={stats.shortTerm.count.toString()} />
              <DetailRow
                label="Oldest Message"
                value={
                  stats.shortTerm.oldestTimestamp
                    ? new Date(stats.shortTerm.oldestTimestamp).toLocaleString()
                    : 'N/A'
                }
              />
              <DetailRow
                label="Working Memory Capacity"
                value={`${stats.working.count} / ${stats.working.capacity}`}
              />
              <DetailRow label="Long-term Facts" value={stats.longTerm.memories.toString()} />
              <DetailRow label="Tracked Entities" value={stats.longTerm.entities.toString()} />
              <DetailRow label="Episodes" value={stats.longTerm.episodes.toString()} />
            </div>
          </div>

          {/* Entity Tracking */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Entity Tracking</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Overmind tracks {stats.longTerm.entities} entities across conversations, including
              people, organizations, and concepts.
            </p>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Entity graph visualization coming in Phase 3
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: ElementType
  title: string
  value: number
  subtitle: string
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`h-8 w-8 ${color}`} />
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{subtitle}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  )
}
