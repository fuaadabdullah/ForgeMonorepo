import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Filter,
  Hammer,
  List,
  type LucideIcon,
  Settings,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useJobs } from '../contexts/useJobs'
import { getRecentCommands, recordCommandUsage } from '../lib/analytics'
import { statusConfig } from '../lib/status'
import { fuzzySearch, sortSearchResults } from '../lib/utils'

type Command = {
  id: string
  title: string
  subtitle?: string
  icon: LucideIcon
  shortcut?: string
  action: () => void
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const { jobs } = useJobs()

  const recentCommands = getRecentCommands()

  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      {
        id: 'spawn-job',
        title: 'Spawn job…',
        subtitle: 'Create and run a new job (choose template)',
        icon: Hammer,
        shortcut: '⌘N',
        action: () => navigate('/jobs/new'),
      },
      {
        id: 'jobs',
        title: 'Jump to Jobs',
        subtitle: 'Browse or search jobs',
        icon: List,
        shortcut: '⌘4',
        action: () => navigate('/jobs'),
      },
      {
        id: 'queues',
        title: 'Open Queues',
        subtitle: 'Jump to job queues and backlogs',
        icon: Zap,
        shortcut: '⌘6',
        action: () => navigate('/queues'),
      },
      {
        id: 'filter-guild',
        title: `Filter by guild (current: ${location.pathname.split('/')[1] || 'all'})`,
        subtitle: 'Quickly scope to a guild',
        icon: Filter,
        action: () => navigate('/forge'),
      },
      {
        id: 'last-failed',
        title: 'Open last failed run',
        subtitle: 'Navigate to the most recent failing run',
        icon: AlertTriangle,
        action: () => {
          const failed = jobs.find((j) => j.runs.some((r) => r.status === 'failed'))
          if (failed) {
            const run = failed.runs.find((r) => r.status === 'failed')
            if (run) navigate(`/jobs/${failed.id}/runs/${run.id}`)
            else navigate('/jobs')
          } else navigate('/jobs')
        },
      },
    ]

    // Page-specific commands
    const pageCommands: Command[] = []

    if (location.pathname.startsWith('/jobs')) {
      pageCommands.push(
        {
          id: 'jobs-refresh',
          title: 'Refresh jobs',
          subtitle: 'Reload the jobs list',
          icon: List,
          action: () => window.location.reload(),
        },
        {
          id: 'jobs-new',
          title: 'Create new job',
          subtitle: 'Spawn a new job from template',
          icon: Hammer,
          action: () => navigate('/jobs/new'),
        }
      )

      // Add job-specific commands if on a specific job page
      const jobId = location.pathname.match(/\/jobs\/([^/]+)/)?.[1]
      if (jobId) {
        const job = jobs.find((j) => j.id === jobId)
        if (job) {
          pageCommands.push(
            {
              id: 'job-runs',
              title: `View ${job.name} runs`,
              subtitle: 'See all runs for this job',
              icon: List,
              action: () => navigate(`/jobs/${jobId}`),
            },
            {
              id: 'job-new-run',
              title: `Run ${job.name}`,
              subtitle: 'Start a new run of this job',
              icon: Zap,
              action: () => navigate(`/jobs/${jobId}/runs/new`),
            }
          )
        }
      }
    } else if (location.pathname.startsWith('/forge')) {
      pageCommands.push(
        {
          id: 'forge-models',
          title: 'Model Management',
          subtitle: 'Configure AI models and providers',
          icon: Settings,
          action: () => navigate('/forge/models'),
        },
        {
          id: 'forge-analytics',
          title: 'Routing Analytics',
          subtitle: 'View AI routing and performance metrics',
          icon: BarChart3,
          action: () => navigate('/forge/analytics'),
        }
      )
    } else if (location.pathname.startsWith('/crews')) {
      pageCommands.push({
        id: 'crews-new',
        title: 'Create Crew',
        subtitle: 'Set up a new multi-agent crew',
        icon: Users,
        action: () => navigate('/crews/new'),
      })
    }

    // Dynamic searchable entities
    const entityCommands: Command[] = []

    // Add job search results
    jobs.forEach((job) => {
      entityCommands.push({
        id: `job-${job.id}`,
        title: job.name,
        subtitle: `Job • ${job.guild || 'No guild'} • ${job.runs.length} runs`,
        icon: Hammer,
        action: () => navigate(`/jobs/${job.id}`),
      })

      // Add run search results for each job
      job.runs.forEach((run) => {
        entityCommands.push({
          id: `run-${job.id}-${run.id}`,
          title: `${job.name} #${run.id}`,
          subtitle: `Run • ${statusConfig[run.status].label} • ${new Date(run.startedAt).toLocaleString()}`,
          icon:
            run.status === 'running'
              ? Zap
              : run.status === 'succeeded'
                ? CheckCircle
                : run.status === 'failed'
                  ? AlertTriangle
                  : run.status === 'degraded'
                    ? AlertTriangle
                    : run.status === 'flaky'
                      ? AlertTriangle
                      : List,
          action: () => navigate(`/jobs/${job.id}/runs/${run.id}`),
        })
      })
    })

    return [...pageCommands, ...baseCommands, ...entityCommands]
  }, [navigate, location, jobs])

  type SearchableCommand = Command & {
    score: number
    highlightedTitle: string
    highlightedSubtitle?: string
  }

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return commands.map((cmd) => ({
        ...cmd,
        score: 0,
        highlightedTitle: cmd.title,
        highlightedSubtitle: cmd.subtitle,
      }))
    }

    const results: SearchableCommand[] = []

    for (const cmd of commands) {
      // Search in title
      const titleResult = fuzzySearch(cmd.title, query)
      if (titleResult.match) {
        results.push({
          ...cmd,
          score: titleResult.score,
          highlightedTitle: titleResult.highlighted,
          highlightedSubtitle: cmd.subtitle,
        })
        continue
      }

      // Search in subtitle if title didn't match
      if (cmd.subtitle) {
        const subtitleResult = fuzzySearch(cmd.subtitle, query)
        if (subtitleResult.match) {
          results.push({
            ...cmd,
            score: subtitleResult.score,
            highlightedTitle: cmd.title,
            highlightedSubtitle: subtitleResult.highlighted,
          })
        }
      }
    }

    return sortSearchResults(results)
  }, [commands, query])

  useEffect(() => setActive(0), [query])

  // Render a small highlighted HTML string produced by fuzzySearch as React nodes
  const renderHighlighted = (html: string) => {
    // split on <mark>...</mark> preserving marks
    const parts = html.split(/(<mark>.*?<\/mark>)/g)
    return parts.map((part, i) => {
      const m = part.match(/^<mark>(.*)<\/mark>$/)
      if (m) return <mark key={i}>{m[1]}</mark>
      return <span key={i}>{part}</span>
    })
  }

  // Focus trapping
  useEffect(() => {
    if (!(open && modalRef.current)) return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[active]
        if (cmd) {
          cmd.action()
          recordCommandUsage(cmd.id)
        }
        onClose()
      }
      if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, filtered.length - 1))
      if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, filtered, active, onClose])

  if (!open) return null

  return (
    <dialog
      aria-modal="true"
      aria-labelledby="command-palette-title"
      aria-describedby="command-palette-description"
      className="fixed inset-0 z-50 flex items-start justify-center p-6"
      onMouseDown={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-lg border border-border bg-popover p-4 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div id="command-palette-title" className="sr-only">
          Command Palette
        </div>
        <div id="command-palette-description" className="sr-only">
          Search and execute commands. Use arrow keys to navigate, Enter to select, Escape to close.
          ⌘K opens this palette from anywhere.
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command or search… (⌘K to open)"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none"
          aria-label="Search commands and navigate to jobs, runs, and pages"
          aria-describedby="command-palette-description"
          aria-activedescendant={filtered[active] ? `command-${filtered[active].id}` : undefined}
        />

        <div className="mt-2 max-h-64 overflow-auto">
          {filtered.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No results</div>
          )}
          {recentCommands.length > 0 && query.trim() === '' && (
            <div className="mb-2 px-2 text-xs text-muted-foreground border-b border-border pb-2">
              Recent commands
            </div>
          )}
          {recentCommands.map((cmdId) => {
            const c = commands.find((x) => x.id === cmdId)
            if (!c) return null
            const Icon = c.icon
            return (
              <button
                key={`recent-${c.id}`}
                id={`command-${c.id}`}
                onClick={() => {
                  c.action()
                  recordCommandUsage(c.id)
                  onClose()
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent/60 flex items-center gap-3"
                aria-label={`${c.title}${c.subtitle ? ` - ${c.subtitle}` : ''}${c.shortcut ? ` (${c.shortcut})` : ''}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-semibold">{c.title}</div>
                  {c.subtitle && <div className="text-xs text-muted-foreground">{c.subtitle}</div>}
                </div>
                {c.shortcut && <span className="text-xs opacity-60 font-mono">{c.shortcut}</span>}
              </button>
            )
          })}

          {(filtered.length > 0 || query.trim() !== '') &&
            recentCommands.length > 0 &&
            query.trim() === '' && (
              <div className="mb-2 px-2 text-xs text-muted-foreground border-b border-border pb-2 mt-2">
                All commands
              </div>
            )}

          {filtered.map((c, idx) => {
            const Icon = c.icon
            return (
              <button
                key={c.id}
                id={`command-${c.id}`}
                onClick={() => {
                  c.action()
                  recordCommandUsage(c.id)
                  onClose()
                }}
                className={`w-full text-left px-3 py-2 transition-colors hover:bg-accent/60 flex items-center gap-3 ${
                  idx === active ? 'bg-accent/70' : ''
                }`}
                onMouseEnter={() => setActive(idx)}
                aria-label={`${c.title}${c.subtitle ? ` - ${c.subtitle}` : ''}${c.shortcut ? ` (${c.shortcut})` : ''}`}
                aria-current={idx === active ? 'true' : undefined}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {renderHighlighted(c.highlightedTitle)}
                  </div>
                  {c.highlightedSubtitle && (
                    <div className="text-xs text-muted-foreground">
                      {renderHighlighted(c.highlightedSubtitle)}
                    </div>
                  )}
                </div>
                {c.shortcut && <span className="text-xs opacity-60 font-mono">{c.shortcut}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </dialog>
  )
}
