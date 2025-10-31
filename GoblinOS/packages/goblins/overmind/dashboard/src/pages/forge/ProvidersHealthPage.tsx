import { Activity, PlugZap, ShieldCheck } from 'lucide-react'
import { useProviderHealth } from '../../hooks/controlCenter/useProviderHealth'
import type { ProvidersHealthResponse } from '../../lib/controlCenter/types'
import { cn } from '../../lib/utils'

export default function ProvidersHealthPage() {
  const query = useProviderHealth()
  const fallback: ProvidersHealthResponse = {
    status: 'ok',
    took_ms: 1337,
    providers: {
      ollama: {
        name: 'ollama',
        ok: true,
        latency_ms: 420,
        url: 'http://localhost:11434',
      },
      litellm: {
        name: 'litellm',
        ok: true,
        latency_ms: 215,
        url: 'http://localhost:4000',
      },
      gemini: {
        name: 'gemini',
        ok: true,
        latency_ms: 620,
        url: 'https://generativelanguage.googleapis.com',
      },
      openai: {
        name: 'openai',
        ok: true,
        latency_ms: 480,
        url: 'https://api.openai.com',
      },
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
          <h1 className="text-3xl font-black text-primary-foreground">🛡️ Provider Pulse</h1>
          <p className="text-sm text-muted-foreground">
            Forge sentries monitor each route continuously.{' '}
            {live
              ? 'Telemetry streaming in from live backends.'
              : 'Using enchanted defaults until live telemetry connects.'}
          </p>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide',
            live ? 'bg-primary/20 text-primary' : 'bg-accent/30 text-accent-foreground'
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {live ? 'Live Telemetry' : 'Arcane Fallback'}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Guild Status
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
            Updated {live ? 'via live spell' : 'via enchanted cache'}
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
            <p className="mt-2 text-xs text-muted-foreground break-all">{provider.url ?? '—'}</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-card/80 p-3 text-sm">
              <PlugZap className="h-4 w-4 text-primary" />
              <div>
                <p className="text-primary-foreground font-semibold">
                  Latency {provider.latency_ms ?? '—'}ms
                </p>
                {provider.error ? (
                  <p className="text-xs text-destructive">{provider.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Forge scouts report optimal route.
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
