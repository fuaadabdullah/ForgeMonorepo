import {
  ActivitySquare,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Eye,
  Target,
  TrendingDown,
  Zap,
} from 'lucide-react'

const responsibilities = [
  {
    title: 'Magnolia Nightbloom · Vermin Huntress',
    icon: AlertTriangle,
    items: [
      'Eliminate flaky pipelines',
      'Coordinate regression triage',
      'Tag incidents with guild taxonomy',
    ],
    kpis: [
      { label: 'Test Flakiness Rate', value: '< 1%', target: '< 1%', status: 'success' },
      { label: 'Regression Detection', value: '< 30min', target: '< 30min', status: 'success' },
      { label: 'Incident MTBF', value: '> 24h', target: '> 24h', status: 'warning' },
    ],
  },
  {
    title: 'Mags Charietto · Omenfinder',
    icon: ActivitySquare,
    items: [
      'Mine logs + traces for early signals',
      'Publish trend reports',
      'Calibrate false-positive thresholds',
    ],
    kpis: [
      { label: 'Signal Precision', value: '> 85%', target: '> 85%', status: 'success' },
      { label: 'False Positive Rate', value: '< 5%', target: '< 5%', status: 'success' },
      { label: 'Early Warning Lead', value: '> 4h', target: '> 4h', status: 'warning' },
    ],
  },
]

const HuntressHomePage = () => {
  return (
    <div className="space-y-6">
      {/* Guild Header */}
      <section className="rounded-2xl border border-primary/25 bg-card/80 p-6 shadow-lg shadow-primary/10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Eye className="h-3 w-3" /> Magnolia Nightbloom & Mags Charietto · Huntress Guild
        </div>
        <h1 className="text-3xl font-black text-primary-foreground">🕵️ Huntress Watch</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Huntress agents stalk flaky gremlins, surface early warnings, and keep incident
          breadcrumbs ready for the rest of the guilds. Magnolia hunts regressions with{' '}
          <code>ollama-coder → openai</code>, Mags scouts signals with{' '}
          <code>ollama-coder → gemini</code>.
        </p>
      </section>

      {/* Instrumentation Panels */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Test Health */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Test Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Suite Status</span>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-green-500">
                <CheckCircle className="h-4 w-4" />
                Passing
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Flaky Tests</span>
              <span className="text-lg font-bold text-primary-foreground">2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Coverage</span>
              <span className="text-lg font-bold text-primary-foreground">87%</span>
            </div>
          </div>
        </div>

        {/* Anomaly Detection */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Anomaly Detection
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Alerts</span>
              <span className="text-lg font-bold text-yellow-500">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">False Positives</span>
              <span className="text-lg font-bold text-green-500">1.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Detection Rate</span>
              <span className="text-lg font-bold text-primary-foreground">94%</span>
            </div>
          </div>
        </div>

        {/* Signal Intelligence */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Signal Intelligence
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Log Volume</span>
              <span className="text-lg font-bold text-primary-foreground">2.1M</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Patterns Found</span>
              <span className="text-lg font-bold text-primary-foreground">47</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Signal Quality</span>
              <span className="text-lg font-bold text-green-500">High</span>
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
              Magnolia Nightbloom (Vermin Huntress)
            </h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">ollama-coder → openai</code>
            <p className="text-xs text-muted-foreground mt-1">Test analysis & debugging</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-2">
              Mags Charietto (Omenfinder)
            </h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">ollama-coder → gemini</code>
            <p className="text-xs text-muted-foreground mt-1">Log analysis & pattern recognition</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HuntressHomePage
