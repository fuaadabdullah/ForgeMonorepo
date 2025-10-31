import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import type { Status } from '../lib/status'
import { useAuth } from './useAuth'
import { toast } from 'react-hot-toast'

export type LogEntry = {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  id: string
}

export type Run = {
  id: string
  startedAt: number
  status: Status
  logs: LogEntry[]
}

export type Job = {
  id: string
  name: string
  guild?: string
  template?: string
  createdAt: number
  runs: Run[]
}

type JobsContextType = {
  jobs: Job[]
  isLoading: boolean
  error: string | null
  currentPage: number
  totalJobs: number
  jobsPerPage: number
  createJob: (data: { name: string; guild?: string; template?: string }) => Promise<Job>
  createRun: (jobId: string) => Promise<Run | undefined>
  addLog: (jobId: string, runId: string, line: string) => Promise<void>
  getJob: (id: string) => Job | undefined
  getLastFailedRun: () => { job?: Job; run?: Run } | undefined
  refreshJobs: () => Promise<void>
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
}

// Helper function to create a LogEntry from a string
function createLogEntry(
  message: string,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info'
): LogEntry {
  return {
    timestamp: Date.now(),
    level,
    message,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
}

const API_BASE = '/api'

export const JobsContext = createContext<JobsContextType | undefined>(undefined)

async function fetchJobs(
  token: string,
  page = 1,
  limit = 10
): Promise<{ jobs: Job[]; total: number }> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    const response = await fetch(`${API_BASE}/jobs?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) throw new Error(`Failed to fetch jobs: ${response.status}`)
    const data = await response.json()
    return {
      jobs: data.jobs || data,
      total: data.total || data.length,
    }
  } catch (e) {
    console.error('Failed to fetch jobs', e)
    return { jobs: [], total: 0 }
  }
}

async function createJobAPI(
  data: { name: string; guild?: string; template?: string },
  token: string
): Promise<Job> {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`Failed to create job: ${response.status}`)
  return await response.json()
}

async function createRunAPI(jobId: string, token: string): Promise<Run> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
  if (!response.ok) throw new Error(`Failed to create run: ${response.status}`)
  return await response.json()
}

async function addLogAPI(jobId: string, runId: string, line: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/runs/${runId}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ line }),
  })
  if (!response.ok) throw new Error(`Failed to add log: ${response.status}`)
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalJobs, setTotalJobs] = useState(0)
  const { token } = useAuth()

  const jobsPerPage = 10

  const refreshJobs = useCallback(
    async (page: number = currentPage) => {
      if (!token) return

      try {
        setIsLoading(true)
        setError(null)
        const response = await fetchJobs(token, page, jobsPerPage)

        // Detect transitions from running -> terminal states so we can notify the user
        try {
          const prev = prevJobsRef.current
          const next = response.jobs
          // For each job/run in next, find the matching run in prev and check for transition
          for (const j of next) {
            const oldJob = prev.find((oj) => oj.id === j.id)
            if (!oldJob) continue
            for (const r of j.runs) {
              const oldRun = oldJob.runs.find((or) => or.id === r.id)
              if (!oldRun) continue
              if (oldRun.status === 'running' && r.status !== 'running') {
                // Fire notification for the transition
                const title = `Job ${j.name} ${r.status === 'succeeded' ? 'succeeded' : r.status === 'failed' ? 'failed' : r.status}`
                const body = `Run ${r.id} ${r.status}.`
                // fire-and-forget
                void notify(title, body, r.status === 'failed' ? 'error' : 'info', {
                  jobId: j.id,
                  runId: r.id,
                  status: r.status,
                })
              }
            }
          }
        } catch (e) {
          console.debug('Failed to detect job transitions', e)
        }

        setJobs(response.jobs)
        setTotalJobs(response.total)
        setCurrentPage(page)
        // update previous snapshot
        prevJobsRef.current = response.jobs
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch jobs')
        console.error('Failed to refresh jobs', e)
      } finally {
        setIsLoading(false)
      }
    },
    [token, currentPage, jobsPerPage]
  )

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= Math.ceil(totalJobs / jobsPerPage)) {
        refreshJobs(page)
      }
    },
    [refreshJobs, totalJobs, jobsPerPage]
  )

  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(totalJobs / jobsPerPage)
    if (currentPage < maxPage) {
      goToPage(currentPage + 1)
    }
  }, [currentPage, totalJobs, jobsPerPage, goToPage])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }, [currentPage, goToPage])

  useEffect(() => {
    refreshJobs()
  }, [refreshJobs])

  // Keep a snapshot of previous jobs to detect transitions when refresh replaces the list
  const prevJobsRef = useRef<Job[]>([])

  // Notification helper: tries Web Notification, in-app toast, and emits a Tauri event if available
  async function notify(
    title: string,
    body: string,
    level: 'info' | 'error' | 'warn' = 'info',
    meta: Record<string, unknown> = {}
  ) {
    try {
      // Web Notification API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          if (Notification.permission === 'default') {
            // request permission but do not await to avoid blocking
            Notification.requestPermission().then((perm) => {
              try {
                if (perm === 'granted') new Notification(title, { body })
              } catch {
                /* noop */
              }
            })
          } else if (Notification.permission === 'granted') {
            try {
              new Notification(title, { body })
            } catch {
              /* noop */
            }
          }
        } catch (e) {
          console.debug('Notification API error', e)
        }
      }

      // In-app toast fallback (won't error if Toaster not mounted)
      try {
        if (level === 'error') toast.error(body)
        else if (level === 'warn') {
          toast.dismiss()
          toast(body)
        } else toast.success(body)
      } catch {
        // ignore
      }

      // Emit a Tauri event so the native layer or other listeners can act on it
      try {
        const mod = await import('@tauri-apps/api/event')
        if (mod && typeof mod.emit === 'function') {
          // do not await the emit
          void mod.emit('goblinos:job-notification', { title, body, level, ...meta })
        }
      } catch {
        // Not running inside Tauri or @tauri-apps/api not available; ignore
      }
    } catch (e) {
      console.debug('notify helper error', e)
    }
  }

  // Real-time updates: Poll for job updates every 30 seconds
  useEffect(() => {
    if (!token) return

    const interval = setInterval(() => {
      refreshJobs(currentPage)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [token, currentPage, refreshJobs])

  // Listen to server-sent notifications from backend and show native notifications
  useEffect(() => {
    if (typeof window === 'undefined') return
    let es: EventSource | null = null

    try {
      es = new EventSource(`${API_BASE}/notifications/stream`)

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          const title = data.title || 'Notification'
          const body = data.body || ''
          try {
            new Notification(title, { body })
          } catch (e) {
            console.debug('Notification failed', e)
          }
        } catch (e) {
          console.debug('Failed to parse notification event', e)
        }
      }

      es.onerror = (err) => {
        console.debug('SSE error', err)
        // if connection closed, EventSource will attempt reconnect automatically
      }
    } catch (e) {
      console.debug('Failed to open notifications EventSource', e)
    }

    return () => {
      if (es) es.close()
    }
  }, [])

  // Advanced run simulation with configurable parameters
  const getSimulationConfig = (guild?: string) => {
    const configs = {
      forge: {
        durationRange: [8000, 20000], // 8-20 seconds
        failureRate: 0.15, // 15% failure rate
        logMessages: [
          'Compiling code...',
          'Running build pipeline...',
          'Executing tests...',
          'Checking performance budgets...',
          'Optimizing bundle size...',
          'Validating dependencies...',
          'Running linters...',
          'Generating artifacts...',
        ],
        errorMessages: [
          'Build failed: TypeScript compilation error',
          'Test suite failed: 2 tests did not pass',
          'Performance budget exceeded',
          'Dependency conflict detected',
        ],
      },
      crafters: {
        durationRange: [12000, 30000], // 12-30 seconds
        failureRate: 0.25, // 25% failure rate
        logMessages: [
          'Designing component...',
          'Running accessibility checks...',
          'Testing user interactions...',
          'Validating responsive design...',
          'Optimizing animations...',
          'Checking color contrast...',
          'Running visual regression tests...',
          'Generating style guide...',
        ],
        errorMessages: [
          'Accessibility violation detected',
          'Visual regression test failed',
          'Responsive design breakpoint issue',
          'Animation performance degraded',
        ],
      },
      huntress: {
        durationRange: [5000, 15000], // 5-15 seconds
        failureRate: 0.35, // 35% failure rate
        logMessages: [
          'Scanning for regressions...',
          'Analyzing test coverage...',
          'Running smoke tests...',
          'Checking error patterns...',
          'Monitoring performance metrics...',
          'Validating data integrity...',
          'Running security scans...',
          'Generating test reports...',
        ],
        errorMessages: [
          'Critical regression detected',
          'Test coverage below threshold',
          'Security vulnerability found',
          'Data integrity check failed',
        ],
      },
      keepers: {
        durationRange: [3000, 10000], // 3-10 seconds
        failureRate: 0.1, // 10% failure rate
        logMessages: [
          'Encrypting sensitive data...',
          'Validating certificates...',
          'Running security audits...',
          'Checking access controls...',
          'Backing up configurations...',
          'Verifying integrity...',
          'Updating secrets...',
          'Generating compliance reports...',
        ],
        errorMessages: [
          'Certificate validation failed',
          'Access control violation',
          'Backup integrity check failed',
          'Compliance requirement not met',
        ],
      },
      mages: {
        durationRange: [15000, 45000], // 15-45 seconds
        failureRate: 0.2, // 20% failure rate
        logMessages: [
          'Analyzing code quality...',
          'Running static analysis...',
          'Checking code patterns...',
          'Validating configurations...',
          'Generating quality metrics...',
          'Running performance analysis...',
          'Checking dependencies...',
          'Creating quality reports...',
        ],
        errorMessages: [
          'Code quality threshold not met',
          'Static analysis found critical issues',
          'Configuration validation failed',
          'Performance regression detected',
        ],
      },
    }

    return (
      configs[guild as keyof typeof configs] || {
        durationRange: [5000, 15000],
        failureRate: 0.3,
        logMessages: [
          'Processing...',
          'Working...',
          'Executing...',
          'Validating...',
          'Completing...',
        ],
        errorMessages: [
          'Process failed',
          'Validation error',
          'Execution error',
          'Unknown error occurred',
        ],
      }
    )
  }

  // Run simulation: periodically update running runs
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((currentJobs) => {
        return currentJobs.map((job) => {
          return {
            ...job,
            runs: job.runs.map((run) => {
              if (run.status !== 'running') return run

              const config = getSimulationConfig(job.guild)
              const elapsed = Date.now() - run.startedAt
              const [minDuration, maxDuration] = config.durationRange
              const shouldComplete =
                elapsed > minDuration + Math.random() * (maxDuration - minDuration)
              const shouldFail = Math.random() < config.failureRate

              if (!shouldComplete) {
                // Add a log line occasionally with guild-specific messages
                if (Math.random() < 0.25) {
                  const randomLine =
                    config.logMessages[Math.floor(Math.random() * config.logMessages.length)]
                  return {
                    ...run,
                    logs: [
                      ...run.logs,
                      createLogEntry(`[${new Date().toISOString()}] ${randomLine}`),
                    ],
                  }
                }
                return run
              }

              // Complete the run with varied status outcomes
              let newStatus: Status
              let errorMessage: string

              if (shouldFail) {
                // Mix of failed and degraded statuses
                newStatus = Math.random() < 0.7 ? 'failed' : 'degraded'
                errorMessage =
                  config.errorMessages[Math.floor(Math.random() * config.errorMessages.length)]
              } else {
                // Mix of succeeded and flaky statuses
                const successRand = Math.random()
                if (successRand < 0.8) {
                  newStatus = 'succeeded'
                  errorMessage = 'Task completed successfully'
                } else {
                  newStatus = 'flaky'
                  errorMessage = 'Task completed with intermittent issues'
                }
              }

              const finalLogs = [
                ...run.logs,
                createLogEntry(
                  `[${new Date().toISOString()}] ${errorMessage}`,
                  shouldFail ? 'error' : 'info'
                ),
              ]

              // Send notification when a run transitions from running -> terminal state
              try {
                const title = `Job ${job.name} ${newStatus === 'succeeded' ? 'succeeded' : newStatus === 'failed' ? 'failed' : newStatus}`
                const body = errorMessage
                void notify(title, body, shouldFail ? 'error' : 'info', {
                  jobId: job.id,
                  runId: run.id,
                  status: newStatus,
                })
              } catch (e) {
                console.debug('Notification error', e)
              }

              return {
                ...run,
                status: newStatus,
                logs: finalLogs,
              }
            }),
          }
        })
      })
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [])

  const createJob = async (data: { name: string; guild?: string; template?: string }) => {
    if (!token) throw new Error('No authentication token')

    // Optimistic update: add job immediately to UI
    const optimisticJob: Job = {
      id: `temp-${Date.now()}`, // Temporary ID
      name: data.name,
      guild: data.guild,
      template: data.template,
      createdAt: Date.now(),
      runs: [],
    }

    setJobs((s) => [optimisticJob, ...s])

    try {
      const newJob = await createJobAPI(data, token)
      // Replace optimistic job with real job
      setJobs((s) => s.map((j) => (j.id === optimisticJob.id ? newJob : j)))
      return newJob
    } catch (e) {
      // Remove optimistic job on error
      setJobs((s) => s.filter((j) => j.id !== optimisticJob.id))
      setError(e instanceof Error ? e.message : 'Failed to create job')
      throw e
    }
  }

  const createRun = async (jobId: string) => {
    if (!token) throw new Error('No authentication token')

    try {
      const newRun = await createRunAPI(jobId, token)
      setJobs((s) => {
        return s.map((j) => (j.id === jobId ? { ...j, runs: [newRun, ...j.runs] } : j))
      })
      return newRun
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create run')
      return undefined
    }
  }

  const addLog = async (jobId: string, runId: string, line: string) => {
    if (!token) throw new Error('No authentication token')

    try {
      await addLogAPI(jobId, runId, line, token)
      setJobs((s) =>
        s.map((j) => {
          if (j.id !== jobId) return j
          return {
            ...j,
            runs: j.runs.map((r) =>
              r.id === runId ? { ...r, logs: [...r.logs, createLogEntry(line)] } : r
            ),
          }
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add log')
      // Still update local state optimistically
      setJobs((s) =>
        s.map((j) => {
          if (j.id !== jobId) return j
          return {
            ...j,
            runs: j.runs.map((r) =>
              r.id === runId ? { ...r, logs: [...r.logs, createLogEntry(line)] } : r
            ),
          }
        })
      )
    }
  }

  const getJob = (id: string) => jobs.find((j) => j.id === id)

  const getLastFailedRun = () => {
    for (const j of jobs) {
      for (const r of j.runs) {
        if (r.status === 'failed') return { job: j, run: r }
      }
    }
    return undefined
  }

  const ctx: JobsContextType = {
    jobs,
    isLoading,
    error,
    currentPage,
    totalJobs,
    jobsPerPage,
    createJob,
    createRun,
    addLog,
    getJob,
    getLastFailedRun,
    refreshJobs,
    goToPage,
    nextPage,
    prevPage,
  }

  return <JobsContext.Provider value={ctx}>{children}</JobsContext.Provider>
}

// Note: hook exported from separate file `useJobs.ts` to keep this module focused on the Provider component
