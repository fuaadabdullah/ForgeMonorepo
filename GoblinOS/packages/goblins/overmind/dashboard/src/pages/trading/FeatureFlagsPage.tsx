import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

interface FeatureFlags {
  enableStreaming: boolean
  enableCaching: boolean
  enableLogging: boolean
  enableTracing: boolean
}

export function TradingFeatureFlagsPanel() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<'live' | 'fallback'>('live')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'}/api/feature-flags`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        setFeatureFlags(data)
        setSource('live')
        setIsLoading(false)
      })
      .catch((err) => {
        console.warn('[TradingFeatureFlags] Falling back to defaults:', err)
        setFeatureFlags({
          enableStreaming: true,
          enableCaching: true,
          enableLogging: true,
          enableTracing: true,
        })
        setSource('fallback')
        setIsLoading(false)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card/60 p-8">
        <h2 className="text-xl font-bold text-primary-foreground">⚙️ Trading Flags</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading risk and execution flags…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary-foreground">⚙️ Trading Flags</h2>
          <p className="text-sm text-muted-foreground">
            Execution controls are{' '}
            {source === 'live'
              ? 'synced with the live trading engine.'
              : 'running on safe fallback parameters.'}
          </p>
        </div>
        <div className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {source === 'live' ? 'Live Telemetry' : 'Fallback Mode'}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            key: 'enableStreaming',
            label: 'Live Streaming',
            description: 'Enable streaming quotes and execution updates.',
            emoji: '📡',
          },
          {
            key: 'enableCaching',
            label: 'Signal Caching',
            description: 'Cache signals to reduce exchange thrash.',
            emoji: '🧠',
          },
          {
            key: 'enableLogging',
            label: 'Trade Logging',
            description: 'Capture detailed trade telemetry and audit logs.',
            emoji: '📊',
          },
          {
            key: 'enableTracing',
            label: 'Latency Tracing',
            description: 'Trace order lifecycles across venues.',
            emoji: '⏱️',
          },
        ].map((flag) => {
          const active = featureFlags?.[flag.key as keyof FeatureFlags] ?? true
          return (
            <div
              key={flag.key}
              className={cn(
                'relative overflow-hidden rounded-2xl border p-5 shadow-lg transition',
                active
                  ? 'border-primary/40 bg-primary/15 shadow-primary/20'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">
                  {flag.emoji}
                </span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {active ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-primary-foreground">{flag.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
              {source === 'fallback' && (
                <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-accent-foreground/70">
                  Running fallback parameters
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
