import { BarChart3, Box, HeartPulse, Settings, Sparkles, Wand2 } from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useOllamaModels } from '../../hooks/controlCenter/useOllamaModels'
import { useProviderHealth } from '../../hooks/controlCenter/useProviderHealth'
import { useDocuments } from '../../hooks/controlCenter/useRAGExplorer'
import { useRoutingAnalytics } from '../../hooks/controlCenter/useRoutingAnalytics'
import { cn } from '../../lib/utils'

export default function TradingLayout() {
  const providerHealth = useProviderHealth()
  const modelsQuery = useOllamaModels()
  const analyticsQuery = useRoutingAnalytics()
  const documentsQuery = useDocuments()

  const providerSummary = providerHealth.data?.providers ?? {
    ollama: { name: 'ollama', ok: true, latency_ms: 420, url: 'http://localhost:11434' },
    litellm: { name: 'litellm', ok: true, latency_ms: 210, url: 'http://localhost:4000' },
  }

  const modelsTotal = modelsQuery.data?.length ?? 4
  const decisionTotal = analyticsQuery.data?.totalRequests ?? 128
  const documentsTotal = documentsQuery.data?.length ?? 6

  return (
    <div className="p-6">
      <section className="mb-8 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-secondary/40 to-primary/5">
        <div className="p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3" /> ForgeTM Trading Platform
            </div>
            <h1 className="text-3xl font-black text-primary-foreground md:text-4xl">
              ⚡ AI Trading &amp; Market Analysis Console
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Deploy intelligent trading algorithms, analyze market trends, and execute trades with
              AI-powered precision. Monitor portfolio performance and optimize strategies in
              real-time.
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-primary/20 bg-card/30 p-6 backdrop-blur md:grid-cols-4">
          <SummaryCard
            title="Active Venues"
            value={`${Object.values(providerSummary).filter((p) => p.ok).length}/${Object.keys(providerSummary).length}`}
            caption="Exchanges online"
            icon={HeartPulse}
          />
          <SummaryCard
            title="AI Strategies"
            value={`${modelsTotal}+`}
            caption="Models deployed"
            icon={Settings}
          />
          <SummaryCard
            title="Market Feeds"
            value={`${documentsTotal}`}
            caption="Data channels"
            icon={Box}
          />
          <SummaryCard
            title="Routed Orders"
            value={`${decisionTotal}`}
            caption="Orders analyzed"
            icon={BarChart3}
          />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        <TradingNavItem to="/trading" label="Dashboard" icon={Box} end />
        <TradingNavItem to="/trading/models" label="Models" icon={Settings} />
        <TradingNavItem to="/trading/rag" label="Intelligence" icon={Wand2} />
        <TradingNavItem to="/trading/flags" label="Flags" icon={Sparkles} />
        <TradingNavItem to="/trading/providers" label="Exchanges" icon={HeartPulse} />
        <TradingNavItem to="/trading/analytics" label="Analytics" icon={BarChart3} />
      </div>

      <Outlet />
    </div>
  )
}

function TradingNavItem({
  to,
  label,
  icon: Icon,
  end = false,
}: {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors border',
          isActive
            ? 'bg-primary text-primary-foreground border-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground border-border'
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )
}

function SummaryCard({
  title,
  value,
  caption,
  icon: Icon,
}: {
  title: string
  value: string
  caption: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-card/70 p-4 shadow-lg shadow-primary/10">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-black text-primary-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}
