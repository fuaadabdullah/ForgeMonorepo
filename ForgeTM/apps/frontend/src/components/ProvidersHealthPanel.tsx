import { QueryObserverResult } from '@tanstack/react-query';
import clsx from 'clsx';
import { ProvidersHealthResponse } from '../lib/types';

interface Props {
  query: QueryObserverResult<ProvidersHealthResponse, Error>;
}

export function ProvidersHealthPanel({ query }: Props) {
  if (query.isLoading) {
    return (
      <div>
        <h2>Provider Health</h2>
        <p><span className="loader" /> Checking providers…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div>
        <h2>Provider Health</h2>
        <div className="empty-state">
          <p>Failed to load provider status.</p>
          <code>{query.error.message}</code>
          <button onClick={() => query.refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  const data = query.data;
  return (
    <div>
      <h2>Provider Health</h2>
      <div className="health-grid">
        {Object.values(data.providers).map((provider) => (
          <div
            key={provider.name}
            className={clsx('health-card', provider.ok ? 'ok' : 'degraded')}
          >
            <div className="meta">
              <span>{provider.name.toUpperCase()}</span>
              <span>{provider.url}</span>
              <span>
                Latency: {provider.latency_ms}ms
                {provider.error ? ` · ${provider.error}` : ''}
              </span>
            </div>
            <div className="tag">
              {provider.ok ? 'Healthy' : 'Degraded'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
