import { BookOpen, Radar, ShieldQuestion } from 'lucide-react'
import { Outlet } from 'react-router-dom'

const HuntressLayout = () => {
  return (
    <div className="p-6">
      <section className="mb-6 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-secondary/40 to-primary/5">
        <div className="p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Radar className="h-3 w-3" /> Magnolia Nightbloom · Vermin Huntress
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary-foreground md:text-4xl">
              🕵️ Huntress Guild Situation Room
            </h1>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              href={
                (import.meta as any).env.VITE_MANUALS_BASE_URL
                  ? `${(import.meta as any).env.VITE_MANUALS_BASE_URL}/Huntress_Operating_Manual.md`
                  : '../../../../../Obsidian/📋 Projects/GoblinOS/Operating_Manuals/Huntress_Operating_Manual.md'
              }
              target="_blank"
              rel="noreferrer"
              title="Huntress Operating Manual"
            >
              <BookOpen className="h-3 w-3" /> Operating Manual
            </a>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Track flakes, regressions, and ominous telemetry. Magnolia runs the flaky hunts with
            LiteBrain <code>ollama-coder</code> → <code>openai</code>; Mags Charietto scouts future
            incidents with <code>ollama-coder</code> → <code>gemini</code>. Every sniffed anomaly
            becomes structured signal.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-primary/20 bg-card/30 px-6 py-4 text-xs text-muted-foreground backdrop-blur">
          <ShieldQuestion className="h-4 w-4" />
          <span>
            KPIs: flaky rate ↓ 50%, MTTR on test failures, valid early signals per week,
            false-positive rate. Incident tags stream into the router audit topic.
          </span>
        </div>
      </section>

      <Outlet />
    </div>
  )
}

export default HuntressLayout
