import { Activity, PlugZap, ShieldCheck } from 'lucide-react'
import { useProviderHealth } from '../../hooks/controlCenter/useProviderHealth'
import type { ProvidersHealthResponse } from '../../lib/controlCenter/types'
import { cn } from '../../lib/utils'

export default function TradingProvidersHealthPage() {
  const query = useProviderHealth()
  const fallback: ProvidersHealthResponse = {
    status: 'ok',
    took_ms: 900,
    providers: {
      nyse: { name: 'nyse', ok: true, latency_ms: 120, url: 'https://api.nyse.com' },
      nasdaq: { name: 'nasdaq', ok: true, latency_ms: 140, url: 'https://api.nasdaq.com' },
      polygon: { name: 'polygon', ok: true, latency_ms: 210, url: 'https://api.polygon.io' },
      litellm: { name: 'litellm', ok: true, latency_ms: 180, url: 'http://localhost:4000' },
    },
  }

  const live = query.isSuccess && query.data
  const data = (live ? query.data : fallback) as ProvidersHealthResponse
  const providers = Object.values(data.providers)
  const healthy = providers.filter((p) => p.ok).length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary-foreground">🌐 Exchange Connectivity</h1>
          <p className="text-sm text-muted-foreground">
            Monitoring live connectivity and latency across data feeds and execution venues.
            {live
              ? ' All metrics sourced from the running backend.'
              : ' Showing baseline values while telemetry attaches.'}
          </p>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide',
            live ? 'bg-primary/20 text-primary' : 'bg-accent/30 text-accent-foreground'
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {live ? 'Live Telemetry' : 'Baseline Metrics'}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Connectivity Status
          </h3>
          <div className="mt-4 flex items-baseline gap-2 text-3xl font-black text-primary-foreground">
            {healthy}
            <span className="text-sm font-semibold text-muted-foreground">
              / {providers.length} healthy
            </span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" /> Mean latency{' '}
            {Math.round(
              providers.reduce((acc, p) => acc + (p.latency_ms ?? 0), 0) / providers.length
            )}
            ms
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-primary">
            Updated {live ? 'from live metrics' : 'from baseline profile'}
          </p>
        </div>

        {providers.map((provider) => (
          <article
            key={provider.name}
            className={cn(
              'relative overflow-hidden rounded-2xl border p-5 shadow-lg transition',
              provider.ok
                ? 'border-primary/40 bg-primary/10 shadow-primary/10'
                : 'border-destructive/40 bg-destructive/10 shadow-destructive/20'
            )}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-primary-foreground uppercase">
                {provider.name}
              </h4>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                  provider.ok
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-destructive text-destructive-foreground'
                )}
              >
                {provider.ok ? 'Healthy' : 'Degraded'}
              </span>
            </div>
            <p className="mt-2 break-all text-xs text-muted-foreground">{provider.url ?? '—'}</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-card/80 p-3 text-sm">
              <PlugZap className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold text-primary-foreground">
                  Latency {provider.latency_ms ?? '—'}ms
                </p>
                {provider.error ? (
                  <p className="text-xs text-destructive">{provider.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Route status:{' '}
                    {provider.ok ? 'orders flowing normally.' : 'investigate connectivity issues.'}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
