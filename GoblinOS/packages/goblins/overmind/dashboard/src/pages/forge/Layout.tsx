import { BarChart3, BookOpen, Box, HeartPulse, Settings, Sparkles, Wand2 } from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useOllamaModels } from '../../hooks/controlCenter/useOllamaModels'
import { useProviderHealth } from '../../hooks/controlCenter/useProviderHealth'
import { useDocuments } from '../../hooks/controlCenter/useRAGExplorer'
import { useRoutingAnalytics } from '../../hooks/controlCenter/useRoutingAnalytics'
import { cn } from '../../lib/utils'

export default function ForgeLayout() {
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
              <Sparkles className="h-3 w-3" /> Forge Guild · Dregg Ember (Forge Master)
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-primary-foreground md:text-4xl">
                🔨 Eternal smithy for the Forge guild&apos;s goblin artisans
              </h1>
              <a
                className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                href={
                  (import.meta as any).env.VITE_MANUALS_BASE_URL
                    ? `${(import.meta as any).env.VITE_MANUALS_BASE_URL}/Forge_Operating_Manual.md`
                    : '../../../../../Obsidian/📋 Projects/GoblinOS/Operating_Manuals/Forge_Operating_Manual.md'
                }
                target="_blank"
                rel="noreferrer"
                title="Forge Operating Manual"
              >
                <BookOpen className="h-3 w-3" /> Operating Manual
              </a>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Command Dregg&apos;s smithy: protect the build graph, enforce performance budgets, and
              unblock break-glass fixes while the LiteBrain routes `ollama → deepseek-r1` with
              `nomic-embed-text` at the ready.
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-primary/20 bg-card/30 p-6 backdrop-blur md:grid-cols-4">
          <SummaryCard
            title="Anvils"
            value={`${Object.values(providerSummary).filter((p) => p.ok).length}/${Object.keys(providerSummary).length}`}
            caption="Forges blazing hot"
            icon={HeartPulse}
          />
          <SummaryCard
            title="Models"
            value={`${modelsTotal}+`}
            caption="Smithy vault stocked"
            icon={Settings}
          />
          <SummaryCard
            title="Lore Library"
            value={`${documentsTotal}`}
            caption="Ancient scrolls forged"
            icon={Box}
          />
          <SummaryCard
            title="Hammer Strikes"
            value={`${decisionTotal}`}
            caption="Blows recorded"
            icon={BarChart3}
          />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        <ForgeNavItem to="/forge" label="Anvil" icon={Box} end />
        <ForgeNavItem to="/forge/models" label="Forging" icon={Settings} />
        <ForgeNavItem to="/forge/rag" label="Lore" icon={Wand2} />
        <ForgeNavItem to="/forge/flags" label="Runes" icon={Sparkles} />
        <ForgeNavItem to="/forge/providers" label="Vitality" icon={HeartPulse} />
        <ForgeNavItem to="/forge/analytics" label="Strikes" icon={BarChart3} />
      </div>

      <Outlet />
    </div>
  )
}

function ForgeNavItem({
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
