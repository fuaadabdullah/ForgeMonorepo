import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProvidersHealthPanel } from '../ProvidersHealthPanel';
import type { QueryObserverResult } from '@tanstack/react-query';
import type { ProvidersHealthResponse } from '../../lib/types';

type QueryMock = Pick<QueryObserverResult<ProvidersHealthResponse, Error>, 'isLoading' | 'isError' | 'error' | 'data' | 'refetch'>;

function renderWithQuery(query: QueryMock) {
  render(<ProvidersHealthPanel query={query as QueryObserverResult<ProvidersHealthResponse, Error>} />);
}

describe('ProvidersHealthPanel', () => {
  it('renders loading state', () => {
    renderWithQuery({
      isLoading: true,
      isError: false,
      error: null,
      data: undefined,
      refetch: vi.fn()
    });
    expect(screen.getByText(/Checking providers/i)).toBeInTheDocument();
  });

  it('renders provider cards when data is available', () => {
    renderWithQuery({
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      data: {
        status: 'ok',
        took_ms: 12,
        providers: {
          ollama: { name: 'ollama', ok: true, latency_ms: 50, url: 'http://localhost:11434' }
        }
      }
    });
    expect(screen.getByText(/OLLAMA/)).toBeInTheDocument();
    expect(screen.getByText(/Healthy/)).toBeInTheDocument();
  });

  it('renders error state', () => {
    renderWithQuery({
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      data: undefined,
      refetch: vi.fn()
    });
    expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });
});
