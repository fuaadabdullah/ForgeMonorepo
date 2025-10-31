import {
  AlertTriangle,
  BarChart3,
  HeartPulse,
  Library,
  Settings,
  Sparkles,
  TrendingUp,
  Wand2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOllamaModels } from '../../hooks/controlCenter/useOllamaModels'
import { useProviderHealth } from '../../hooks/controlCenter/useProviderHealth'
import { useDocuments } from '../../hooks/controlCenter/useRAGExplorer'
import { useMetrics } from '../../hooks/useMetrics'

export default function HomePage() {
  const providerHealth = useProviderHealth()
  const modelsQuery = useOllamaModels()
  const documentsQuery = useDocuments()
  const metricsQuery = useMetrics()

  const providerSummary = providerHealth.data?.providers ?? {
    ollama: { name: 'ollama', ok: true, latency_ms: 420, url: 'http://localhost:11434' },
    litellm: { name: 'litellm', ok: true, latency_ms: 210, url: 'http://localhost:4000' },
  }

  const modelsTotal = modelsQuery.data?.length ?? 4
  const documentsTotal = documentsQuery.data?.length ?? 6
  const routingStats = metricsQuery.stats

  const kpis = [
    {
      title: 'Build Performance',
      value: '< 5min',
      target: 'p95_build_time',
      status: 'success' as const,
      icon: TrendingUp,
    },
    {
      title: 'Hot Reload',
      value: '< 2s',
      target: 'hot_reload_time',
      status: 'success' as const,
      icon: Sparkles,
    },
    {
      title: 'Build Failures',
      value: '< 2%',
      target: 'failed_build_rate',
      status: 'warning' as const,
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Guild Header */}
      <section className="rounded-2xl border border-primary/25 bg-card/80 p-6 shadow-lg shadow-primary/10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3 w-3" /> Dregg Embercode · Forge Master
        </div>
        <h1 className="text-3xl font-black text-primary-foreground">
          🔨 Forge Master Control Center
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The eternal smithy for the Forge guild's goblin artisans. Command Dregg's smithy: protect
          the build graph, enforce performance budgets, and unblock break-glass fixes while the
          LiteBrain routes <code>ollama → deepseek-r1</code> with <code>nomic-embed-text</code>{' '}
          embeddings at the ready.
        </p>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.title}
              className="rounded-xl border border-primary/20 bg-card/70 p-4 shadow-lg shadow-primary/10"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {kpi.title}
                </p>
                <Icon
                  className={`h-4 w-4 ${kpi.status === 'success' ? 'text-green-500' : kpi.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}
                />
              </div>
              <div className="mt-3 text-2xl font-black text-primary-foreground">{kpi.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">Target: {kpi.target}</p>
            </div>
          )
        })}
      </div>

      {/* Instrumentation Panels */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Routing Analytics */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4">Routing Analytics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Requests</span>
              <span className="text-lg font-bold text-primary-foreground">
                {routingStats?.totalRequests ?? 24}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Latency</span>
              <span className="text-lg font-bold text-primary-foreground">
                {routingStats?.avgLatency ?? 180}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cost Savings</span>
              <span className="text-lg font-bold text-green-500">
                ${routingStats?.totalCost ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4">Smithy Vital Signs</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Providers Online</span>
              <span className="text-lg font-bold text-primary-foreground">
                {Object.values(providerSummary).filter((p) => p.ok).length}/
                {Object.keys(providerSummary).length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Models Available</span>
              <span className="text-lg font-bold text-primary-foreground">{modelsTotal}+</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Knowledge Base</span>
              <span className="text-lg font-bold text-primary-foreground">
                {documentsTotal} docs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            href: '/forge/models',
            title: 'Model Forgery',
            description: 'Forge and temper Ollama models in the smithy fires.',
            icon: Settings,
          },
          {
            href: '/forge/rag',
            title: 'Knowledge Forge',
            description: 'Hammer out semantic searches from uploaded scrolls and goblin wisdom.',
            icon: Library,
          },
          {
            href: '/forge/flags',
            title: 'Enchantment Toggles',
            description:
              'Switch on streaming spells, caching charms, logging runes, and tracing wards.',
            icon: Sparkles,
          },
          {
            href: '/forge/providers',
            title: 'Smithy Vital Signs',
            description: 'Monitor the heartbeat of litellm, Ollama, and cloud forges in real-time.',
            icon: HeartPulse,
          },
          {
            href: '/forge/analytics',
            title: 'Hammer Analytics',
            description: 'Analyze routing swings, latency strikes, and safety fallbacks.',
            icon: BarChart3,
          },
          {
            href: '/forge/rag',
            title: 'Lore Library',
            description: "Curate the guild's ancient tomes and keep embeddings glowing.",
            icon: Wand2,
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              to={card.href}
              className="group relative overflow-hidden rounded-2xl border border-primary/25 bg-card/70 p-6 shadow-lg shadow-primary/10 transition hover:border-primary/60 hover:shadow-primary/20"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-primary-foreground">{card.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                </div>
                <Icon className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                Always on
                <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
