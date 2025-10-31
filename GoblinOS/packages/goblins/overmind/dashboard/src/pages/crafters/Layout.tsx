import { BadgeInfo, BookOpen, Sparkles } from 'lucide-react'
import { Outlet } from 'react-router-dom'

const CraftersLayout = () => {
  return (
    <div className="p-6">
      <section className="mb-6 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-secondary/40 to-primary/5">
        <div className="p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3 w-3" /> Vanta Lumin · Glyph Scribe
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary-foreground md:text-4xl">
              🎨 Crafters Guild Studio
            </h1>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              href={
                (import.meta as any).env.VITE_MANUALS_BASE_URL
                  ? `${(import.meta as any).env.VITE_MANUALS_BASE_URL}/Crafters_Operating_Manual.md`
                  : '../../../../../Obsidian/📋 Projects/GoblinOS/Operating_Manuals/Crafters_Operating_Manual.md'
              }
              target="_blank"
              rel="noreferrer"
              title="Crafters Operating Manual"
            >
              <BookOpen className="h-3 w-3" /> Operating Manual
            </a>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Shape every surface the Overmind touches. The Crafters Guild owns UI systems, theme
            tokens, accessibility conformance, schema contracts, and queue topologies. LiteBrains
            route <code>ollama</code> → <code>deepseek-r1</code> for Vanta and{' '}
            <code>ollama-coder</code> → <code>deepseek-r1</code> for Volt with routing analytics
            baked in.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-primary/20 bg-card/30 px-6 py-4 text-xs text-muted-foreground backdrop-blur">
          <BadgeInfo className="h-4 w-4" />
          <span>
            Metrics on deck: CLS &lt; 0.1, LCP &lt; 2.5s, accessibility ≥ 95, schema drift = 0. PR
            gate: <code>crafters/ui-a11y-check</code>.
          </span>
        </div>
      </section>

      <Outlet />
    </div>
  )
}

export default CraftersLayout
