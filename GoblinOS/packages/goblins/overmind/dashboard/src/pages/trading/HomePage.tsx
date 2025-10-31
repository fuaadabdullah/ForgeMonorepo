import { BarChart3, HeartPulse, Library, Settings, Sparkles, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/25 bg-card/80 p-6 shadow-lg shadow-primary/10">
        <h1 className="text-3xl font-black text-primary-foreground">📈 ForgeTM Trading Platform</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          AI-powered trading console for market analysis, algorithmic strategies, and real-time
          execution. Monitor positions, analyze trends, and deploy automated trading bots.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            href: '/trading/models',
            title: 'AI Models',
            description: 'Deploy and manage trading AI models for market prediction.',
            icon: Settings,
          },
          {
            href: '/trading/rag',
            title: 'Market Intelligence',
            description: 'Ingest market data and news for enhanced trading decisions.',
            icon: Library,
          },
          {
            href: '/trading/flags',
            title: 'Trading Flags',
            description: 'Configure trading parameters and risk management settings.',
            icon: Sparkles,
          },
          {
            href: '/trading/providers',
            title: 'Exchange Health',
            description: 'Monitor connectivity to trading exchanges and data feeds.',
            icon: HeartPulse,
          },
          {
            href: '/trading/analytics',
            title: 'Performance Analytics',
            description: 'Track trading performance, P&L, and strategy effectiveness.',
            icon: BarChart3,
          },
          {
            href: '/trading/rag',
            title: 'Trading Lore',
            description: 'Curate historical trading data and market insights.',
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
