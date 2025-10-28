import { OllamaModel, ProvidersHealthResponse, PullModelRequest, PullModelResponse } from './types';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

function getBaseUrl() {
  return import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function fetchProvidersHealth(): Promise<ProvidersHealthResponse> {
  const res = await fetch(`${getBaseUrl()}/providers/health`);
  return handleResponse<ProvidersHealthResponse>(res);
}

export async function fetchOllamaModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${getBaseUrl()}/ollama/models`);
  return handleResponse<OllamaModel[]>(res);
}

export async function pullOllamaModel(payload: PullModelRequest): Promise<PullModelResponse> {
  const res = await fetch(`${getBaseUrl()}/ollama/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PullModelResponse>(res);
}
