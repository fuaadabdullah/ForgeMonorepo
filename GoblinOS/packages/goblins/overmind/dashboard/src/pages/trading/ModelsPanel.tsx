import { type QueryObserverResult, useQuery } from '@tanstack/react-query'
import { BrainCircuit, PackagePlus, RefreshCw } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useOllamaModels } from '../../hooks/controlCenter/useOllamaModels'
import { usePullModel } from '../../hooks/controlCenter/usePullModel'
import { getBaseUrl } from '../../lib/controlCenter/api'
import type { OllamaModel, PullModelRequest } from '../../lib/controlCenter/types'
import { cn } from '../../lib/utils'

interface Props {
  query?: QueryObserverResult<OllamaModel[], Error>
  onPull?: (payload: PullModelRequest) => Promise<void>
}

export function TradingModelsPanel({ query, onPull }: Props) {
  const internalModelsQuery = useOllamaModels()
  const internalPull = usePullModel(internalModelsQuery.refetch)
  const effectiveQuery = query ?? internalModelsQuery
  const effectiveOnPull = onPull ?? internalPull
  const [busyModel, setBusyModel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelInput, setModelInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const modelDetailsQuery = useQuery({
    queryKey: ['trading-model', selectedModel],
    queryFn: async () => {
      if (!selectedModel) return null
      const response = await fetch(`${getBaseUrl()}/ollama/models/${selectedModel}`)
      if (!response.ok) throw new Error('Failed to fetch model details')
      return response.json()
    },
    enabled: Boolean(selectedModel),
  })

  const handlePull = async (model: string) => {
    try {
      setBusyModel(model)
      setError(null)
      await effectiveOnPull({ model, stream: false })
      if (!query) {
        internalModelsQuery.refetch()
      } else {
        effectiveQuery.refetch()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyModel(null)
    }
  }

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Remove strategy "${modelName}" from the vault?`)) {
      return
    }

    try {
      setBusyModel(modelName)
      setError(null)
      const response = await fetch(`${getBaseUrl()}/ollama/models/${modelName}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete model')
      }
      if (!query) {
        internalModelsQuery.refetch()
      } else {
        effectiveQuery.refetch()
      }
      if (selectedModel === modelName) {
        setSelectedModel(null)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyModel(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!modelInput.trim()) return
    await handlePull(modelInput.trim())
    setModelInput('')
  }

  const fallbackModels: OllamaModel[] = [
    { name: 'market-maker:7b', size: 3_900_000_000, digest: 'trading-market-maker' },
    { name: 'alpha-scout:8b', size: 4_400_000_000, digest: 'trading-alpha-scout' },
    { name: 'risk-guardian:6b', size: 3_500_000_000, digest: 'trading-risk-guardian' },
  ]

  const loading = effectiveQuery.isLoading
  const usingFallback = effectiveQuery.isError
  const models = usingFallback ? fallbackModels : (effectiveQuery.data ?? fallbackModels)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl	font-bold text-primary-foreground">🧠 Strategy Vault</h2>
          <p className="text-sm text-muted-foreground">
            {usingFallback
              ? 'Placeholder strategies loaded while the trading models initialize.'
              : loading
                ? 'Fetching the deployed trading strategies from the engine.'
                : 'Manage on-device and remote models powering trading intelligence.'}
          </p>
        </div>
        <div
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            usingFallback ? 'bg-accent/40 text-accent-foreground' : 'bg-primary/20 text-primary'
          )}
        >
          {usingFallback ? 'Fallback Vault' : loading ? 'Syncing…' : 'Live Vault'}
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-primary/30 bg-card/80 p-5 shadow-lg shadow-primary/10 md:grid-cols-[1fr_auto] md:items-center"
      >
        <div>
          <label
            htmlFor="strategy-name"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Strategy identifier
          </label>
          <input
            id="strategy-name"
            value={modelInput}
            onChange={(event) => setModelInput(event.target.value)}
            placeholder="e.g. alpha-scout"
            aria-label="Strategy name"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            disabled={usingFallback}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!modelInput || busyModel !== null || usingFallback}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            <PackagePlus className="h-4 w-4" />
            {busyModel ? 'Deploying…' : 'Deploy strategy'}
          </button>
          <button
            type="button"
            onClick={() => effectiveQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Deployed strategies
          </h3>
          <div className="grid gap-3">
            {models.map((model) => (
              <div
                key={model.name}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border border-primary/30 bg-card/80 p-4 transition hover:border-primary/60',
                  selectedModel === model.name && 'ring-2 ring-primary/60'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-primary-foreground">{model.name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {model.size && <span>{(model.size / 1_000_000_000).toFixed(2)} GB</span>}
                      {model.digest && <span>{model.digest.slice(0, 12)}…</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                    <span className="rounded-full bg-primary/20 px-2.5 py-1 text-primary">
                      Local
                    </span>
                    <span className="rounded-full bg-accent/20 px-2.5 py-1 text-accent-foreground">
                      Trading Ready
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setSelectedModel(selectedModel === model.name ? null : model.name)
                    }
                    className="rounded-lg border border-primary/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                  >
                    {selectedModel === model.name ? 'Hide Details' : 'Inspect'}
                  </button>
                  <button
                    onClick={() => handlePull(model.name)}
                    disabled={busyModel !== null || usingFallback}
                    className="rounded-lg border border-primary/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Re-sync
                  </button>
                  <button
                    onClick={() => handleDelete(model.name)}
                    disabled={busyModel !== null || usingFallback}
                    className="rounded-lg border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
                {selectedModel === model.name && (
                  <div className="rounded-lg border border-primary/20 bg-card/70 p-4 text-sm">
                    {modelDetailsQuery.isLoading && (
                      <p className="text-muted-foreground">Loading details…</p>
                    )}
                    {modelDetailsQuery.isError && (
                      <p className="text-destructive">Failed to load strategy metadata.</p>
                    )}
                    {modelDetailsQuery.data && (
                      <pre className="mt-2 overflow-auto rounded bg-background/60 p-3 text-xs text-muted-foreground">
                        {JSON.stringify(modelDetailsQuery.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-primary/30 bg-card/80 p-4 shadow-lg shadow-primary/10">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <BrainCircuit className="h-4 w-4 text-primary" />
            Strategy insights
          </div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>Deploy new strategies by referencing their model identifiers.</li>
            <li>Use the re-sync action to refresh weights from the registry.</li>
            <li>Inspect metadata for performance notes and hyper-parameters.</li>
            <li>Remove dormant strategies to free compute capacity.</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
