import {
  AlertTriangle,
  ArrowRight,
  Bolt,
  CheckCircle,
  Palette,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react'

const responsibilities = [
  {
    title: 'Vanta Lumin · Glyph Scribe',
    icon: Palette,
    items: [
      'Design tokens + UI systems',
      'Accessibility + CLS/LCP budgets',
      'Design QA + visual drift watch',
    ],
    kpis: [
      { label: 'Accessibility Score', value: '95%', target: '≥ 95%', status: 'success' },
      { label: 'CLS Budget', value: '< 0.1', target: '< 0.1', status: 'success' },
      { label: 'LCP Budget', value: '< 2.5s', target: '< 2.5s', status: 'warning' },
    ],
  },
  {
    title: 'Volt Furnace · Socketwright',
    icon: Bolt,
    items: [
      'API + schema contracts',
      'Queue topology + idempotency',
      'Error budgets + resilience drills',
    ],
    kpis: [
      { label: 'API Uptime', value: '99.9%', target: '≥ 99.9%', status: 'success' },
      { label: 'Error Rate', value: '< 0.1%', target: '< 0.1%', status: 'success' },
      { label: 'Queue Latency', value: '< 100ms', target: '< 100ms', status: 'success' },
    ],
  },
]

const CraftersHomePage = () => {
  return (
    <div className="space-y-6">
      {/* Guild Header */}
      <section className="rounded-2xl border border-primary/25 bg-card/80 p-6 shadow-lg shadow-primary/10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Palette className="h-3 w-3" /> Vanta Lumin & Volt Furnace · Crafters Guild
        </div>
        <h1 className="text-3xl font-black text-primary-foreground">🎨 Crafters Studio</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Shape every surface the Overmind touches. The Crafters Guild owns UI systems, theme
          tokens, accessibility conformance, schema contracts, and queue topologies. Vanta routes{' '}
          <code>ollama → deepseek-r1</code> for design, Volt routes{' '}
          <code>ollama-coder → deepseek-r1</code> for APIs.
        </p>
      </section>

      {/* Instrumentation Panels */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* System Health */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">API Status</span>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-green-500">
                <CheckCircle className="h-4 w-4" />
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">UI Components</span>
              <span className="text-lg font-bold text-primary-foreground">247</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Schema Contracts</span>
              <span className="text-lg font-bold text-primary-foreground">89</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Response Time</span>
              <span className="text-lg font-bold text-primary-foreground">45ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Queue Depth</span>
              <span className="text-lg font-bold text-primary-foreground">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <span className="text-lg font-bold text-green-500">0.02%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guild Members */}
      <div className="grid gap-4 md:grid-cols-2">
        {responsibilities.map(({ title, icon: Icon, items, kpis }) => (
          <article
            key={title}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <header className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-semibold text-primary-foreground">{title}</h2>
            </header>

            {/* KPIs */}
            <div className="grid gap-2">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary-foreground">{kpi.value}</span>
                    {kpi.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : kpi.status === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Responsibilities */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Responsibilities</h3>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      {/* LiteBrain Configuration */}
      <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
        <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          LiteBrain Routing
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-semibold text-primary-foreground mb-2">
              Vanta Lumin (Glyph Scribe)
            </h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">ollama → deepseek-r1</code>
            <p className="text-xs text-muted-foreground mt-1">UI/UX design & accessibility</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-2">
              Volt Furnace (Socketwright)
            </h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">ollama-coder → deepseek-r1</code>
            <p className="text-xs text-muted-foreground mt-1">API design & backend logic</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CraftersHomePage
