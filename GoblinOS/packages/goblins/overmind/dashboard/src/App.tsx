import {
  Activity,
  BarChart3,
  Box,
  Brain,
  Hammer,
  LogOut,
  Radar,
  Settings,
  Users,
} from 'lucide-react'
import React from 'react'
import { listen } from '@tauri-apps/api/event'
import { Toaster, toast } from 'react-hot-toast'
import type { ElementType } from 'react'
import {
  type Location,
  NavLink,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import CommandPalette from './components/CommandPalette'
import ContextualNav from './components/ContextualNav'
import { JobsProvider } from './contexts/JobsContext'
import { useAuth } from './contexts/useAuth'
import { shipTelemetry } from './lib/analytics'
import { cn } from './lib/utils'
import ChatPage from './pages/ChatPage'
import CrewsPage from './pages/CrewsPage'
import MemoryPage from './pages/MemoryPage'
import MetricsPage from './pages/MetricsPage'
import ModelsPage from './pages/ModelsPage'
import LoginPage from './pages/auth/LoginPage'
import CraftersHomePage from './pages/crafters/HomePage'
import CraftersLayout from './pages/crafters/Layout'
import { FeatureFlagsPanel as FeatureFlagsPage } from './pages/forge/FeatureFlagsPage'
import HomePage from './pages/forge/HomePage'
import ForgeLayout from './pages/forge/Layout'
import { OllamaModelPanel as ModelsPanel } from './pages/forge/ModelsPanel'
import ProvidersHealthPage from './pages/forge/ProvidersHealthPage'
import { RAGExplorerPanel as RAGExplorerPage } from './pages/forge/RAGExplorerPage'
import { RoutingAnalyticsPanel as RoutingAnalyticsPage } from './pages/forge/RoutingAnalyticsPage'
import HuntressHomePage from './pages/huntress/HomePage'
import HuntressLayout from './pages/huntress/Layout'
import JobsHomePage from './pages/jobs/HomePage'
import JobRunPage from './pages/jobs/JobRunPage'
import JobsLayout from './pages/jobs/Layout'
import LogsPage from './pages/jobs/LogsPage'
import KeepersHomePage from './pages/keepers/HomePage'
import KeepersLayout from './pages/keepers/Layout'
import MagesHomePage from './pages/mages/HomePage'
import MagesLayout from './pages/mages/Layout'

function App() {
  return (
    <Router>
      <AppRoutes />
      <Toaster position="top-right" />
    </Router>
  )
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation() as Location & { state?: { from?: string } }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Initializing Overmind…
      </div>
    )
  }

  if (location.pathname.startsWith('/auth') && isAuthenticated) {
    const target =
      location.state?.from && location.state.from !== '/auth/login' ? location.state.from : '/forge'
    return <Navigate to={target} replace />
  }

  if (!(isAuthenticated || location.pathname.startsWith('/auth'))) {
    const requested = `${location.pathname}${location.search}`
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: requested === '/' ? '/forge' : requested }}
      />
    )
  }

  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/*" element={<AuthenticatedApp />} />
    </Routes>
  )
}

function AuthenticatedApp() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+K: Toggle command palette
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((p) => !p)
        return
      }

      // Cmd/Ctrl+N: New job
      if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        navigate('/jobs/new')
        return
      }

      // Cmd/Ctrl+,: Settings
      if (isCmdOrCtrl && e.key === ',') {
        e.preventDefault()
        navigate('/settings')
        return
      }

      // Cmd/Ctrl+1-9: Navigate to sections
      if (isCmdOrCtrl && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const routes = [
          '/', // 1: Overview
          '/crews', // 2: Guilds
          '/agents', // 3: Agents
          '/jobs', // 4: Jobs
          '/runs', // 5: Runs
          '/queues', // 6: Queues
          '/models', // 7: Models
          '/artifacts', // 8: Artifacts
          '/settings', // 9: Settings
        ]
        const index = Number.parseInt(e.key) - 1
        if (routes[index]) {
          navigate(routes[index])
        }
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  // Ship telemetry periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      shipTelemetry()
    }, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Listen for backend-started events from Tauri and show a native notification
  React.useEffect(() => {
    let unlisten: (() => void) | null = null
    ;(async () => {
      try {
        unlisten = await listen('goblinos:backend-started', () => {
          try {
            // Use the Web Notification API which works both in browser and Tauri
            if (typeof window !== 'undefined' && 'Notification' in window) {
              try {
                // If permission is needed, request it (no-op if already granted)
                if (Notification.permission === 'default') {
                  Notification.requestPermission()
                    .then(() => {
                      try {
                        if (Notification.permission === 'granted')
                          new Notification('GoblinOS Hub', { body: 'Backend started and ready' })
                      } catch {
                        /* noop */
                      }
                    })
                    .catch(() => {
                      /* ignore */
                    })
                } else {
                  try {
                    new Notification('GoblinOS Hub', { body: 'Backend started and ready' })
                  } catch {
                    /* noop */
                  }
                }
              } catch {
                // ignore notification errors
              }
            }
          } catch {
            // ignore errors
          }
        })
      } catch {
        // Not running inside Tauri or event not available
      }
    })()
    return () => {
      try {
        if (unlisten) unlisten()
      } catch {
        // noop
      }
    }
  }, [])

  // Listen for job notifications (emitted from JobsContext or native layer)
  React.useEffect(() => {
    let unlisten: (() => void) | null = null
    ;(async () => {
      try {
        unlisten = await listen('goblinos:job-notification', (ev) => {
            try {
              const payload = ev.payload as Record<string, unknown> | undefined
              const title = String(payload?.title ?? 'GoblinOS Hub')
              const body = String(payload?.body ?? '')
              const level = String(payload?.level ?? 'info')
            // Web Notification
            try {
              if (typeof window !== 'undefined' && 'Notification' in window) {
                  if (Notification.permission === 'default') {
                    Notification.requestPermission()
                      .then(() => {
                        try {
                          if (Notification.permission === 'granted') new Notification(title, { body })
                        } catch {
                          /* noop */
                        }
                      })
                      .catch(() => {
                        /* ignore */
                      })
                  } else {
                    try {
                      new Notification(title, { body })
                    } catch {
                      /* noop */
                    }
                  }
              }
            } catch {
              /* noop */
            }

            // In-app toast
            try {
              if (level === 'error') toast.error(body)
              else toast.success(body)
            } catch {
              /* noop */
            }
          } catch {
            // ignore
          }
        })
      } catch {
        // Not running inside Tauri or event not available
      }
    })()
    return () => {
      try {
        if (unlisten) unlisten()
      } catch {
        // noop
      }
    }
  }, [])

  return (
    <JobsProvider>
      <div className="flex h-screen bg-background">
        <aside className="flex w-64 flex-col border-r border-border bg-card">
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Overmind</h1>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-4">
            <div className="mb-4">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Navigation
              </h3>
              <div className="space-y-1">
                <NavItem to="/" icon={Activity} label="Overview" shortcut="⌘1" />
                <NavItem to="/crews" icon={Users} label="Guilds" shortcut="⌘2" />
                <NavItem to="/agents" icon={Brain} label="Agents" shortcut="⌘3" />
                <NavItem to="/jobs" icon={Hammer} label="Jobs" shortcut="⌘4" />
                <NavItem to="/runs" icon={BarChart3} label="Runs" shortcut="⌘5" />
                <NavItem to="/queues" icon={Radar} label="Queues" shortcut="⌘6" />
                <NavItem to="/models" icon={Settings} label="Models" shortcut="⌘7" />
                <NavItem to="/artifacts" icon={Box} label="Artifacts" shortcut="⌘8" />
                <NavItem to="/settings" icon={Settings} label="Settings" shortcut="⌘," />
              </div>
            </div>
          </nav>
          <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-semibold text-primary-foreground">
                  {user?.full_name ?? user?.username}
                </span>
                <span>{user?.email}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
            </div>
          </footer>
        </aside>

        <ContextualNav />

        <main className="flex-1 overflow-auto">
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/crews" element={<CrewsPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/models" element={<ModelsPage />} />

            <Route path="/forge" element={<ForgeLayout />}>
              <Route index element={<HomePage />} />
              <Route path="models" element={<ModelsPanel />} />
              <Route path="rag" element={<RAGExplorerPage />} />
              <Route path="flags" element={<FeatureFlagsPage />} />
              <Route path="providers" element={<ProvidersHealthPage />} />
              <Route path="analytics" element={<RoutingAnalyticsPage />} />
            </Route>

            <Route path="/crafters" element={<CraftersLayout />}>
              <Route index element={<CraftersHomePage />} />
            </Route>

            <Route path="/huntress" element={<HuntressLayout />}>
              <Route index element={<HuntressHomePage />} />
            </Route>

            <Route path="/keepers" element={<KeepersLayout />}>
              <Route index element={<KeepersHomePage />} />
            </Route>

            <Route path="/mages" element={<MagesLayout />}>
              <Route index element={<MagesHomePage />} />
            </Route>

            {/* Jobs & workflow funnel */}
            <Route path="/jobs" element={<JobsLayout />}>
              <Route index element={<JobsHomePage />} />
              <Route path="new" element={<div className="p-6">Spawn job form (placeholder)</div>} />
              <Route path=":jobId/runs/:runId" element={<JobRunPage />}>
                <Route path="logs" element={<LogsPage />} />
              </Route>
              <Route path="last-failed" element={<JobRunPage />} />
            </Route>

            <Route path="/queues" element={<div className="p-6">Queues (placeholder)</div>} />
            <Route path="/agents" element={<div className="p-6">Agents (placeholder)</div>} />
            <Route path="/runs" element={<div className="p-6">Runs (placeholder)</div>} />
            <Route path="/artifacts" element={<div className="p-6">Artifacts (placeholder)</div>} />
            <Route path="/settings" element={<div className="p-6">Settings (placeholder)</div>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </JobsProvider>
  )
}

function NavItem({
  to,
  icon: Icon,
  label,
  shortcut,
}: { to: string; icon: ElementType; label: string; shortcut?: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-xs opacity-60 font-mono">{shortcut}</span>}
    </NavLink>
  )
}

export default App
