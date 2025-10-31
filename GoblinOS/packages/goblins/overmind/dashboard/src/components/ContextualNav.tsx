import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

export default function ContextualNav() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)
  const section = parts[0] || 'overview'

  const sections: Record<
    string,
    { title: string; items: Array<{ to: string; label: string; shortcut?: string }> }
  > = {
    overview: {
      title: 'Overview',
      items: [
        { to: '/', label: 'Activity', shortcut: '⌘1' },
        { to: '/metrics', label: 'Metrics' },
        { to: '/models', label: 'Models' },
      ],
    },
    forge: {
      title: 'Forge',
      items: [
        { to: '/forge', label: 'Anvils', shortcut: '⌘2' },
        { to: '/forge/models', label: 'Models' },
        { to: '/forge/analytics', label: 'Analytics' },
      ],
    },
    crafters: {
      title: 'Crafters',
      items: [{ to: '/crafters', label: 'Studio', shortcut: '⌘3' }],
    },
    huntress: {
      title: 'Huntress',
      items: [{ to: '/huntress', label: 'Watch', shortcut: '⌘4' }],
    },
    mages: {
      title: 'Mages',
      items: [{ to: '/mages', label: 'Observatory', shortcut: '⌘5' }],
    },
    keepers: {
      title: 'Keepers',
      items: [{ to: '/keepers', label: 'Vault', shortcut: '⌘6' }],
    },
    trading: {
      title: 'Trading',
      items: [{ to: '/trading', label: 'Console', shortcut: '⌘7' }],
    },
    jobs: {
      title: 'Jobs',
      items: [
        { to: '/jobs', label: 'All Jobs', shortcut: '⌘4' },
        { to: '/jobs/new', label: 'Spawn Job', shortcut: '⌘N' },
        { to: '/queues', label: 'Queues', shortcut: '⌘6' },
      ],
    },
  }

  const current = sections[section] ?? sections.overview

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card px-3 py-4 md:flex">
      <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {current.title}
      </div>
      <div className="flex flex-col gap-1">
        {current.items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )
            }
          >
            <span>{it.label}</span>
            {it.shortcut && <span className="text-xs opacity-60 font-mono">{it.shortcut}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
