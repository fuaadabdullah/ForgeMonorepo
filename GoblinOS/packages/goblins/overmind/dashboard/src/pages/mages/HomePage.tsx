import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'

const responsibilities = [
  {
    title: 'Hex Oracle · Forecasting Fiend',
    icon: Activity,
    items: ['Release risk scoring', 'Capacity forecasting', 'Incident likelihood modeling'],
    kpis: [
      { label: 'Forecast Accuracy', value: '> 80%', target: '> 80%', status: 'success' },
      { label: 'Capacity Planning', value: '> 2w', target: '> 2w', status: 'success' },
      { label: 'Risk Assessment', value: '> 90%', target: '> 90%', status: 'warning' },
    ],
  },
  {
    title: 'Grim Rune · Glitch Whisperer',
    icon: Target,
    items: [
      'Anomaly detection across metrics/logs/traces',
      'Automated ticket routing',
      'Alert precision + recall tuning',
    ],
    kpis: [
      { label: 'Anomaly Detection', value: '> 95%', target: '> 95%', status: 'success' },
      { label: 'False Positive Rate', value: '< 10%', target: '< 10%', status: 'success' },
      { label: 'Auto Ticket Accuracy', value: '> 75%', target: '> 75%', status: 'warning' },
    ],
  },
  {
    title: 'Launcey Gauge · Fine Spellchecker',
    icon: ClipboardCheck,
    items: ['Lint/test/schema gates', 'Diátaxis conformance audits', 'PR gate maintenance'],
    kpis: [
      { label: 'Lint Compliance', value: '> 98%', target: '> 98%', status: 'success' },
      { label: 'Test Coverage', value: '> 85%', target: '> 85%', status: 'success' },
      { label: 'PR Gate Success', value: '> 95%', target: '> 95%', status: 'success' },
    ],
  },
]

const MagesHomePage = () => {
  return (
    <div className="space-y-6">
      {/* Guild Header */}
      <section className="rounded-2xl border border-primary/25 bg-card/80 p-6 shadow-lg shadow-primary/10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Activity className="h-3 w-3" /> Hex Oracle, Grim Rune & Launcey Gauge · Mages Guild
        </div>
        <h1 className="text-3xl font-black text-primary-foreground">🔮 Mages Observatory</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Mages project futures, chase anomalies, and keep the spellbook (tests, lint, schemas)
          pristine. Hex forecasts with <code>ollama → deepseek-r1</code>, Grim detects with{' '}
          <code>ollama-coder → deepseek-r1</code>, Launcey enforces with{' '}
          <code>ollama → deepseek-r1</code>.
        </p>
      </section>

      {/* Instrumentation Panels */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Forecasting */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Forecasting
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Next Release Risk</span>
              <span className="text-lg font-bold text-green-500">Low</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Capacity Forecast</span>
              <span className="text-lg font-bold text-primary-foreground">2.3 weeks</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Prediction Accuracy</span>
              <span className="text-lg font-bold text-green-500">87%</span>
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
              <span className="text-sm text-muted-foreground">Active Anomalies</span>
              <span className="text-lg font-bold text-yellow-500">2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Auto Tickets</span>
              <span className="text-lg font-bold text-primary-foreground">5</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Detection Rate</span>
              <span className="text-lg font-bold text-green-500">96%</span>
            </div>
          </div>
        </div>

        {/* Quality Gates */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quality Gates
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lint Status</span>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-green-500">
                <CheckCircle className="h-4 w-4" />
                Passing
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Test Coverage</span>
              <span className="text-lg font-bold text-primary-foreground">89%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">PR Gates</span>
              <span className="text-lg font-bold text-green-500">97%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guild Members */}
      <div className="grid gap-4 md:grid-cols-3">
        {responsibilities.map(({ title, icon: Icon, items, kpis }) => (
          <article
            key={title}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <header className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-base font-semibold text-primary-foreground">{title}</h2>
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
          LiteBrain Routing Matrix
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h4 className="font-semibold text-primary-foreground mb-2">Hex Oracle</h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">ollama → deepseek-r1</code>
            <p className="text-xs text-muted-foreground mt-1">Forecasting & analytics</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-2">Grim Rune</h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">ollama-coder → deepseek-r1</code>
            <p className="text-xs text-muted-foreground mt-1">Anomaly detection & automation</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-2">Launcey Gauge</h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">ollama → deepseek-r1</code>
            <p className="text-xs text-muted-foreground mt-1">Quality gates & standards</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MagesHomePage
