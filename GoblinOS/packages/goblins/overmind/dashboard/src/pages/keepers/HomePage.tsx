import { ArrowRight, CheckCheck, Database, FileCheck, KeyRound, Lock, Shield } from 'lucide-react'

const kpis = [
  {
    title: 'Secret Rotation',
    value: '100%',
    target: '100%',
    status: 'success' as const,
    icon: Lock,
  },
  {
    title: 'Backup Success',
    value: '99.9%',
    target: '> 99.9%',
    status: 'success' as const,
    icon: Database,
  },
  {
    title: 'Security Scan Coverage',
    value: '95%',
    target: '> 95%',
    status: 'warning' as const,
    icon: Shield,
  },
]

const responsibilities = [
  'Rotate secrets and credentials on a fixed cadence',
  'Maintain SBOM + license attestations with zero drift',
  'Sign every artifact and rehearse backup restores',
  'License compliance and dependency auditing',
  'Security posture monitoring and vulnerability assessment',
]

const KeepersHomePage = () => {
  return (
    <div className="space-y-6">
      {/* Guild Header */}
      <section className="rounded-2xl border border-primary/25 bg-card/80 p-6 shadow-lg shadow-primary/10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <KeyRound className="h-3 w-3" /> Sentenial Ledgerwarden · Sealkeeper
        </div>
        <h1 className="text-3xl font-black text-primary-foreground">🔐 Keepers Vault</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Keepers lock down the vault—secrets, SBOMs, licenses, attestations, and backups all flow
          through Sentenial Ledgerwarden. The Sealkeeper routes <code>ollama → deepseek-r1</code>{' '}
          with <code>nomic-embed-text</code> embeddings for security analysis.
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
        {/* Security Status */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vulnerability Scan</span>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-green-500">
                <CheckCheck className="h-4 w-4" />
                Clean
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Secrets Detected</span>
              <span className="text-lg font-bold text-primary-foreground">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Compliance Score</span>
              <span className="text-lg font-bold text-green-500">98%</span>
            </div>
          </div>
        </div>

        {/* Vault Health */}
        <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
          <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Vault Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Backup Status</span>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-green-500">
                <CheckCheck className="h-4 w-4" />
                Current
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">SBOM Integrity</span>
              <span className="text-lg font-bold text-green-500">Verified</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Retention Period</span>
              <span className="text-lg font-bold text-primary-foreground">13 months</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsibilities */}
      <div className="rounded-xl border border-primary/20 bg-card/70 p-6 shadow-lg shadow-primary/10">
        <h3 className="text-lg font-semibold text-primary-foreground mb-4 flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Sealkeeper Responsibilities
        </h3>
        <ul className="space-y-2">
          {responsibilities.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Telemetry Footer */}
      <footer className="flex items-center gap-2 rounded-lg bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        <CheckCheck className="h-4 w-4 text-primary" />
        <span>
          Telemetry from router audit and SBOM scanners is retained in the Keepers vault for 13
          months.
        </span>
      </footer>
    </div>
  )
}

export default KeepersHomePage
