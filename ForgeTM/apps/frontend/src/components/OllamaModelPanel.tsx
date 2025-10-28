import { QueryObserverResult, useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { OllamaModel, PullModelRequest } from '../lib/types';

interface Props {
  query: QueryObserverResult<OllamaModel[], Error>;
  onPull: (payload: PullModelRequest) => Promise<void>;
}

export function OllamaModelPanel({ query, onPull }: Props) {
  const [busyModel, setBusyModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelInput, setModelInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Query for model details
  const modelDetailsQuery = useQuery({
    queryKey: ['ollama', 'model', selectedModel],
    queryFn: async () => {
      if (!selectedModel) return null;
      const response = await fetch(`/ollama/models/${selectedModel}`);
      if (!response.ok) throw new Error('Failed to fetch model details');
      return response.json();
    },
    enabled: !!selectedModel,
  });

  const handlePull = async (model: string) => {
    try {
      setBusyModel(model);
      setError(null);
      await onPull({ model, stream: false });
      query.refetch(); // Refresh the models list
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyModel(null);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete the model "${modelName}"?`)) {
      return;
    }

    try {
      setBusyModel(modelName);
      setError(null);
      const response = await fetch(`/ollama/models/${modelName}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete model');
      }
      query.refetch(); // Refresh the models list
      if (selectedModel === modelName) {
        setSelectedModel(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyModel(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modelInput.trim()) {
      return;
    }
    await handlePull(modelInput.trim());
    setModelInput('');
  };

  if (query.isLoading) {
    return (
      <div className="panel">
        <h2>Ollama Models</h2>
        <p><span className="loader" /> Loading models…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="panel">
        <h2>Ollama Models</h2>
        <div className="empty-state">
          <p>Unable to load models from Ollama.</p>
          <code>{query.error.message}</code>
          <button onClick={() => query.refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  const models = query.data ?? [];

  return (
    <div className="panel">
      <h2>Ollama Models</h2>
      <form onSubmit={handleSubmit} className="model-form">
        <input
          value={modelInput}
          onChange={(event) => setModelInput(event.target.value)}
          placeholder="e.g. llama3.1"
          aria-label="Model name"
        />
        <button type="submit" disabled={!modelInput || busyModel !== null}>
          {busyModel ? 'Pulling…' : 'Pull model'}
        </button>
      </form>
      {error && (
        <div className="empty-state" role="alert">
          <p>{error}</p>
        </div>
      )}
      {models.length === 0 ? (
        <div className="empty-state">
          <p>No models installed yet. Pull one to get started.</p>
        </div>
      ) : (
        <div className="models-grid">
          <div className="models-list">
            <h3>Installed Models</h3>
            {models.map((model) => (
              <div key={model.name} className={`model-row ${selectedModel === model.name ? 'selected' : ''}`}>
                <div className="model-info">
                  <span className="model-name">{model.name}</span>
                  <div className="model-meta">
                    {model.size && <span>{(model.size / 1_000_000_000).toFixed(2)} GB</span>}
                    {model.digest && <span>{model.digest.slice(0, 12)}…</span>}
                  </div>
                </div>
                <div className="model-actions">
                  <button
                    onClick={() => setSelectedModel(selectedModel === model.name ? null : model.name)}
                    className="btn-secondary"
                  >
                    {selectedModel === model.name ? 'Hide Details' : 'Show Details'}
                  </button>
                  <button
                    onClick={() => handlePull(model.name)}
                    disabled={busyModel !== null}
                    className="btn-secondary"
                  >
                    {busyModel === model.name ? 'Pulling…' : 'Re-pull'}
                  </button>
                  <button
                    onClick={() => handleDelete(model.name)}
                    disabled={busyModel !== null}
                    className="btn-danger"
                  >
                    {busyModel === model.name ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {selectedModel && (
            <div className="model-details">
              <h3>Model Details: {selectedModel}</h3>
              {modelDetailsQuery.isLoading ? (
                <p><span className="loader" /> Loading details…</p>
              ) : modelDetailsQuery.isError ? (
                <div className="empty-state">
                  <p>Failed to load model details.</p>
                  <button onClick={() => modelDetailsQuery.refetch()}>Retry</button>
                </div>
              ) : modelDetailsQuery.data ? (
                <div className="model-details-content">
                  <div className="detail-section">
                    <h4>Basic Information</h4>
                    <dl>
                      <dt>Name:</dt>
                      <dd>{modelDetailsQuery.data.name || 'N/A'}</dd>
                      <dt>Size:</dt>
                      <dd>{modelDetailsQuery.data.size ? `${(modelDetailsQuery.data.size / 1_000_000_000).toFixed(2)} GB` : 'N/A'}</dd>
                      <dt>Digest:</dt>
                      <dd>{modelDetailsQuery.data.digest || 'N/A'}</dd>
                      <dt>Modified:</dt>
                      <dd>{modelDetailsQuery.data.modified_at || 'N/A'}</dd>
                    </dl>
                  </div>
                  {modelDetailsQuery.data.details && (
                    <div className="detail-section">
                      <h4>Model Details</h4>
                      <dl>
                        <dt>Format:</dt>
                        <dd>{modelDetailsQuery.data.details.format || 'N/A'}</dd>
                        <dt>Family:</dt>
                        <dd>{modelDetailsQuery.data.details.family || 'N/A'}</dd>
                        <dt>Families:</dt>
                        <dd>{modelDetailsQuery.data.details.families?.join(', ') || 'N/A'}</dd>
                        <dt>Parameter Size:</dt>
                        <dd>{modelDetailsQuery.data.details.parameter_size || 'N/A'}</dd>
                        <dt>Quantization:</dt>
                        <dd>{modelDetailsQuery.data.details.quantization_level || 'N/A'}</dd>
                      </dl>
                    </div>
                  )}
                  {modelDetailsQuery.data.template && (
                    <div className="detail-section">
                      <h4>Template</h4>
                      <pre>{modelDetailsQuery.data.template}</pre>
                    </div>
                  )}
                  {modelDetailsQuery.data.parameters && (
                    <div className="detail-section">
                      <h4>Parameters</h4>
                      <pre>{modelDetailsQuery.data.parameters}</pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
