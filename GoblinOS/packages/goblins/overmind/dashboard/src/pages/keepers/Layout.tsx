import { BookOpen, Lock, Scroll } from 'lucide-react'
import { Outlet } from 'react-router-dom'

const KeepersLayout = () => {
  return (
    <div className="p-6">
      <section className="mb-6 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-secondary/40 to-primary/5">
        <div className="p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Lock className="h-3 w-3" /> Sentenial Ledgerwarden · Sealkeeper
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary-foreground md:text-4xl">
              🔐 Keepers Guild Vault
            </h1>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              href={
                (import.meta as any).env.VITE_MANUALS_BASE_URL
                  ? `${(import.meta as any).env.VITE_MANUALS_BASE_URL}/Keepers_Operating_Manual.md`
                  : '../../../../../Obsidian/📋 Projects/GoblinOS/Operating_Manuals/Keepers_Operating_Manual.md'
              }
              target="_blank"
              rel="noreferrer"
              title="Keepers Operating Manual"
            >
              <BookOpen className="h-3 w-3" /> Operating Manual
            </a>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Seal secrets, track SBOM drift, and sign every artifact. Sentenial&apos;s LiteBrain
            routes <code>ollama</code> + <code>nomic-embed-text</code> → <code>deepseek-r1</code> to
            stay sharp on compliance dossiers.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-primary/20 bg-card/30 px-6 py-4 text-xs text-muted-foreground backdrop-blur">
          <Scroll className="h-4 w-4" />
          <span>
            KPIs: secrets rotated on schedule, SBOM drift = 0, unsigned artifacts = 0, backups
            rehearsed. PR gate: <code>keepers/sentenial-check</code>.
          </span>
        </div>
      </section>

      <Outlet />
    </div>
  )
}

export default KeepersLayout
