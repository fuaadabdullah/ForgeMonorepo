import type { QueryObserverResult } from '@tanstack/react-query'
import { Activity, BarChart3, Flame, ShieldCheck, Zap } from 'lucide-react'
import type { ComponentType } from 'react'
import { useRoutingAnalytics } from '../../hooks/controlCenter/useRoutingAnalytics'
import type { RoutingStats } from '../../lib/controlCenter/types'
import { cn } from '../../lib/utils'

interface Props {
  query?: QueryObserverResult<RoutingStats, Error>
}

export function RoutingAnalyticsPanel({ query }: Props) {
  const internal = useRoutingAnalytics()
  const q = query ?? internal

  if (q.isLoading && !q.data) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card/70 p-8 text-sm text-muted-foreground">
        <span className="loader mr-2" /> Summoning routing analytics…
      </div>
    )
  }

  const fallbackStats: RoutingStats = {
    totalRequests: 256,
    providerUsage: { ollama: 142, openai: 74, gemini: 28, deepseek: 12 },
    averageLatency: { ollama: 480, openai: 720, gemini: 690, deepseek: 640 },
    costSavings: 37.42,
    fallbackRate: 0.06,
    recentDecisions: Array.from({ length: 6 }).map((_, idx) => ({
      timestamp: new Date(Date.now() - idx * 60_000).toISOString(),
      taskType: ['chat', 'analysis', 'embedding'][idx % 3],
      selectedProvider: ['ollama', 'openai', 'gemini'][idx % 3],
      selectedModel: ['llama3.1:8b', 'gpt-4o', 'gemini-pro'][idx % 3],
      reason: [
        'Cost-optimized local route',
        'Premium quality requested',
        'Latency-sensitive request',
      ][idx % 3],
      latency: [420, 780, 650][idx % 3],
      cost: [0, 0.07, 0.05][idx % 3],
      fallbackUsed: idx === 2,
    })),
  }

  const usingFallback = q.isError || !q.data
  const stats = q.data ?? fallbackStats
  const totalRequests = stats.totalRequests
  const providerUsage = Object.entries(stats.providerUsage) as Array<[string, number]>
  const averageLatencies = Object.entries(stats.averageLatency) as Array<[string, number]>

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary-foreground">🛰️ Routing Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {usingFallback
              ? 'Showing enchanted telemetry until live analytics channel stabilizes.'
              : 'Live decision stream across providers, models, and fallback logic.'}
          </p>
        </div>
        <div
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            usingFallback ? 'bg-accent/40 text-accent-foreground' : 'bg-primary/20 text-primary'
          )}
        >
          {usingFallback ? 'Arcane Fallback' : 'Live Telemetry'}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={Activity}
          label="Total Requests"
          value={`${totalRequests}`}
          subtitle="Logged by Forge routers"
        />
        <MetricCard
          icon={Flame}
          label="Cost Savings"
          value={`$${stats.costSavings.toFixed(2)}`}
          subtitle="Vs. cloud-only routing"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Fallback Rate"
          value={`${(stats.fallbackRate * 100).toFixed(1)}%`}
          subtitle="Safety reroutes"
        />
      </div>

      <section className="rounded-2xl border border-primary/25 bg-card/70 p-6 shadow-lg shadow-primary/10">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4 text-primary" /> Provider usage
        </h3>
        <div className="mt-4 space-y-3">
          {providerUsage.map(([provider, count]) => {
            const percentage = totalRequests > 0 ? (count / totalRequests) * 100 : 0
            return (
              <div key={provider}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-primary-foreground">
                    {provider.toUpperCase()}
                  </span>
                  <span>
                    {count} requests • {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-primary/25 bg-card/70 p-6 shadow-lg shadow-primary/10">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" /> Average latency by provider
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {averageLatencies.map(([provider, latency]) => (
            <div key={provider} className="rounded-xl border border-primary/20 bg-card/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {provider.toUpperCase()}
              </div>
              <div className="mt-2 text-2xl font-bold text-primary-foreground">
                {latency.toFixed(0)}ms
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min((latency / 1500) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-primary/25 bg-card/70 p-6 shadow-lg shadow-primary/10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent decisions
        </h3>
        {stats.recentDecisions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No decisions yet—fire a request to populate the log.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {stats.recentDecisions.slice(0, 10).map((decision, index) => (
              <div
                key={`${decision.timestamp}-${index}`}
                className="rounded-xl border border-primary/20 bg-card/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="uppercase tracking-wide">{decision.taskType}</span>
                  <span>{new Date(decision.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold text-primary-foreground">
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-primary">
                    {decision.selectedProvider.toUpperCase()}
                  </span>
                  <span>{decision.selectedModel}</span>
                  {decision.latency && (
                    <span className="text-xs text-muted-foreground">{decision.latency}ms</span>
                  )}
                  {decision.fallbackUsed && (
                    <span className="rounded-full bg-destructive/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                      Fallback
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{decision.reason}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-card/70 p-4 shadow-lg shadow-primary/10">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold text-primary-foreground">{value}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}
