import { type QueryObserverResult, useQuery } from '@tanstack/react-query'
import { PackagePlus, RefreshCw, Sparkles } from 'lucide-react'
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

export function OllamaModelPanel({ query, onPull }: Props) {
  // If props aren't supplied (page usage), use the hooks internally.
  const internalModelsQuery = useOllamaModels()
  const internalPull = usePullModel(internalModelsQuery.refetch)
  const effectiveQuery = query ?? internalModelsQuery
  const effectiveOnPull = onPull ?? internalPull
  const [busyModel, setBusyModel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelInput, setModelInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Query for model details
  const modelDetailsQuery = useQuery({
    queryKey: ['ollama', 'model', selectedModel],
    queryFn: async () => {
      if (!selectedModel) return null
      const response = await fetch(`${getBaseUrl()}/ollama/models/${selectedModel}`)
      if (!response.ok) throw new Error('Failed to fetch model details')
      return response.json()
    },
    enabled: !!selectedModel,
  })

  const handlePull = async (model: string) => {
    try {
      setBusyModel(model)
      setError(null)
      await effectiveOnPull({ model, stream: false })
      // If using internal query, it will be refetched by the hook's onSuccess; otherwise caller manages refetch
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
    if (!confirm(`Are you sure you want to delete the model "${modelName}"?`)) {
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
    if (!modelInput.trim()) {
      return
    }
    await handlePull(modelInput.trim())
    setModelInput('')
  }

  const fallbackModels: OllamaModel[] = [
    { name: 'llama3.1:8b', size: 4_500_000_000, digest: 'forge-llama' },
    { name: 'mistral-nova:7b', size: 4_100_000_000, digest: 'forge-mistral' },
    { name: 'deepseek-coder:6.7b', size: 3_700_000_000, digest: 'forge-coder' },
  ]

  const loading = effectiveQuery.isLoading
  const usingFallback = effectiveQuery.isError
  const models = usingFallback ? fallbackModels : (effectiveQuery.data ?? fallbackModels)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary-foreground">🪄 Ollama Vault</h2>
          <p className="text-sm text-muted-foreground">
            {usingFallback
              ? 'Forge rehearsal models loaded while Ollama awakens.'
              : loading
                ? 'Fetching live manifests from the Ollama daemon.'
                : 'Manage local models, pull new runes, and inspect metadata.'}
          </p>
        </div>
        <div
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            usingFallback ? 'bg-accent/40 text-accent-foreground' : 'bg-primary/20 text-primary'
          )}
        >
          {usingFallback ? 'Arcane Fallback' : loading ? 'Summoning…' : 'Live Manifest'}
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-primary/30 bg-card/80 p-5 shadow-lg shadow-primary/10 md:grid-cols-[1fr_auto] md:items-center"
      >
        <div>
          <label
            htmlFor="model-name"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Model incantation
          </label>
          <input
            id="model-name"
            value={modelInput}
            onChange={(event) => setModelInput(event.target.value)}
            placeholder="e.g. llama3.1"
            aria-label="Model name"
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
            {busyModel ? 'Summoning…' : 'Pull model'}
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
            Installed models
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
                      Forge Ready
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
                    {selectedModel === model.name ? 'Hide Details' : 'Show Details'}
                  </button>
                  <button
                    onClick={() => handlePull(model.name)}
                    disabled={busyModel !== null || usingFallback}
                    className="rounded-lg border border-primary/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyModel === model.name ? 'Recharging…' : 'Re-pull'}
                  </button>
                  <button
                    onClick={() => handleDelete(model.name)}
                    disabled={busyModel !== null || usingFallback}
                    className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyModel === model.name ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-card/80 p-4 shadow-lg shadow-primary/10">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Details
          </h3>
          {selectedModel ? (
            modelDetailsQuery.isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="loader mr-2" /> Gathering metadata…
              </p>
            ) : modelDetailsQuery.isError ? (
              <div className="mt-4 text-sm text-destructive">
                Failed to load model details.
                <button
                  className="ml-2 text-primary underline"
                  onClick={() => modelDetailsQuery.refetch()}
                >
                  Retry
                </button>
              </div>
            ) : modelDetailsQuery.data ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-semibold text-primary-foreground">
                    {modelDetailsQuery.data.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Size</dt>
                  <dd className="font-semibold text-primary-foreground">
                    {modelDetailsQuery.data.size
                      ? `${(modelDetailsQuery.data.size / 1_000_000_000).toFixed(2)} GB`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Digest</dt>
                  <dd className="font-mono text-xs text-muted-foreground">
                    {modelDetailsQuery.data.digest || 'N/A'}
                  </dd>
                </div>
                {modelDetailsQuery.data.details && (
                  <div>
                    <dt className="text-muted-foreground">Format</dt>
                    <dd className="font-semibold text-primary-foreground">
                      {modelDetailsQuery.data.details.format || 'N/A'}
                    </dd>
                  </div>
                )}
                {modelDetailsQuery.data.template && (
                  <div>
                    <dt className="text-muted-foreground">Template</dt>
                    <dd className="rounded-lg bg-secondary/40 p-3 text-xs text-secondary-foreground">
                      {modelDetailsQuery.data.template}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Select a model to inspect its runes.
              </p>
            )
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Select a model to inspect its runes.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
