import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OllamaModelPanel } from '../OllamaModelPanel';
import type { QueryObserverResult } from '@tanstack/react-query';
import type { OllamaModel } from '../../lib/types';

type QueryMock = Pick<QueryObserverResult<OllamaModel[], Error>, 'isLoading' | 'isError' | 'error' | 'data' | 'refetch'>;

function renderWithQuery(query: QueryMock, onPull = vi.fn().mockResolvedValue(undefined)) {
  render(
    <OllamaModelPanel
      query={query as QueryObserverResult<OllamaModel[], Error>}
      onPull={onPull}
    />
  );
  return onPull;
}

describe('OllamaModelPanel', () => {
  it('shows empty state when no models', () => {
    renderWithQuery({
      isLoading: false,
      isError: false,
      error: null,
      data: [],
      refetch: vi.fn()
    });
    expect(screen.getByText(/No models installed/)).toBeInTheDocument();
  });

  it('renders models and triggers pull', async () => {
    const onPull = vi.fn().mockResolvedValue(undefined);
    renderWithQuery({
      isLoading: false,
      isError: false,
      error: null,
      data: [
        { name: 'llama3.1', size: 4_000_000_000, digest: 'abc123' }
      ],
      refetch: vi.fn()
    }, onPull);

    fireEvent.click(screen.getByRole('button', { name: /Re-pull/i }));
    expect(onPull).toHaveBeenCalledWith({ model: 'llama3.1', stream: false });
  });

  it('handles pull errors gracefully', async () => {
    const onPull = vi.fn().mockRejectedValue(new Error('network failure'));
    renderWithQuery({
      isLoading: false,
      isError: false,
      error: null,
      data: [{ name: 'phi3', size: 2_000_000_000 }],
      refetch: vi.fn()
    }, onPull);

    fireEvent.click(screen.getByRole('button', { name: /Re-pull/i }));
    await screen.findByRole('alert');
    expect(onPull).toHaveBeenCalled();
  });
});
