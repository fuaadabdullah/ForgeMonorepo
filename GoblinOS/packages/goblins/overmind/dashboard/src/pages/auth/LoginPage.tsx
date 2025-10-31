import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DEV_LOGIN_ENABLED,
  DEV_LOGIN_PASSWORD,
  DEV_LOGIN_USERNAME,
} from '../../contexts/devLoginConfig'
import { useAuth } from '../../contexts/useAuth'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState =
    typeof location.state === 'object' && location.state !== null && 'from' in location.state
      ? (location.state as { from?: string })
      : null
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    username: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const destination = locationState?.from ?? '/forge'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login(formState.username, formState.password)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card/80 p-8 shadow-xl shadow-primary/10 backdrop-blur">
        <header className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            Overmind Access
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">
            Sign in to command the guilds
          </h1>
          <p className="text-sm text-muted-foreground">
            Authenticate to orchestrate goblin guilds, trading systems, and intelligence workflows.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              Username or Email
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={formState.username}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  username: event.target.value,
                }))
              }
              disabled={submitting || isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={formState.password}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              disabled={submitting || isLoading}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            disabled={submitting || isLoading}
          >
            {submitting ? 'Authenticating…' : 'Sign in'}
          </button>

          {DEV_LOGIN_ENABLED && (
            <p className="text-center text-xs text-muted-foreground">
              Emergency override available — use <code>{DEV_LOGIN_USERNAME}</code> /{' '}
              <code>{DEV_LOGIN_PASSWORD}</code> if the backend is unreachable.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
