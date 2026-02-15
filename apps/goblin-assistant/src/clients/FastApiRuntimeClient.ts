import { api } from '../api/http-client';
import { trackApiCall, trackLLMOperation } from '../utils/error-tracking';
import type {
  RuntimeClient,
  GoblinStatus,
  MemoryEntry,
  GoblinStats,
  CostSummary,
  OrchestrationPlan,
  StreamChunk,
  TaskResponse,
  User,
} from '../types/api';

// FastAPI backend URL (when using the FastAPI runtime)
const FASTAPI_BASE =
  process.env.NEXT_PUBLIC_FASTAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://goblin-backend.fly.dev';

export class FastApiRuntimeClient implements RuntimeClient {
  async getGoblins(): Promise<GoblinStatus[]> {
    return trackApiCall(
      async () => {
        const response = await api.get<GoblinStatus[]>('/v1/goblins');
        return response.data || [];
      },
      '/v1/goblins',
      'GET'
    );
  }

  async getProviders(): Promise<string[]> {
    return trackApiCall(
      async () => {
        const response = await api.get<string[]>('/v1/routing/providers');
        return response.data || [];
      },
      '/v1/routing/providers',
      'GET'
    );
  }

  async getProviderModels(provider: string): Promise<string[]> {
    return trackApiCall(
      async () => {
        const response = await api.get<string[]>(`/v1/routing/providers/${provider}`);
        return response.data || [];
      },
      `/v1/routing/providers/${provider}`,
      'GET',
      { provider }
    );
  }

  async executeTask(
    goblin: string,
    task: string,
    _streaming = false,
    code?: string,
    provider?: string,
    model?: string
  ): Promise<string> {
    const response = await api.post<{ taskId: string }>('/v1/execute', {
      goblin,
      task,
      code,
      provider,
      model,
    });
    return response.data.taskId;
  }

  async storeApiKey(provider: string, key: string): Promise<void> {
    await api.post(`/v1/api-keys/${provider}`, key);
  }

  async getApiKey(provider: string): Promise<string | null> {
    try {
      const response = await api.get<{ key?: string }>(`/v1/api-keys/${provider}`);
      return response.data.key || null;
    } catch (error) {
      return null;
    }
  }

  async clearApiKey(provider: string): Promise<void> {
    await api.delete(`/v1/api-keys/${provider}`);
  }

  async getHistory(_goblin: string, _limit = 10): Promise<MemoryEntry[]> {
    return trackApiCall(
      async () => {
        const response = await api.get<MemoryEntry[]>(
          `/v1/goblins/${_goblin}/history?limit=${_limit}`
        );
        return response.data || [];
      },
      `/v1/goblins/${_goblin}/history`,
      'GET',
      { goblin: _goblin, limit: _limit }
    );
  }

  async getStats(_goblin: string): Promise<GoblinStats> {
    return trackApiCall(
      async () => {
        const response = await api.get<GoblinStats>(`/v1/goblins/${_goblin}/stats`);
        return response.data || {};
      },
      `/v1/goblins/${_goblin}/stats`,
      'GET',
      { goblin: _goblin }
    );
  }

  async getCostSummary(): Promise<CostSummary> {
    return trackApiCall(
      async () => {
        const response = await api.get<CostSummary>('/v1/cost-summary');
        return response.data || { total_cost: 0, cost_by_provider: {}, cost_by_model: {} };
      },
      '/v1/cost-summary',
      'GET'
    );
  }

  async parseOrchestration(text: string, defaultGoblin?: string): Promise<OrchestrationPlan> {
    const response = await api.post<OrchestrationPlan>('/v1/parse', {
      text,
      default_goblin: defaultGoblin,
    });
    return response.data;
  }

  async executeTaskStreaming(
    goblin: string,
    task: string,
    onChunk: (chunk: StreamChunk) => void,
    onComplete?: (response: TaskResponse) => void,
    code?: string,
    provider?: string,
    model?: string
  ): Promise<void> {
    return trackLLMOperation(
      async () => {
        const taskId = await this.executeTask(goblin, task, true, code, provider, model);
        // open a streaming connection to /stream endpoint
        const evtSourceUrl = `${FASTAPI_BASE}/v1/stream?task_id=${taskId}&goblin=${encodeURIComponent(goblin)}&task=${encodeURIComponent(task)}`;
        const evtSource = new EventSource(evtSourceUrl);
        return new Promise<void>((resolve, reject) => {
          evtSource.onmessage = (e: MessageEvent) => {
            try {
              const payload = JSON.parse(e.data);
              onChunk(payload);
              if (payload.result !== undefined) {
                if (onComplete) onComplete(payload);
                evtSource.close();
                resolve();
              }
            } catch (err) {
              // ignore parse errors
            }
          };
          evtSource.onerror = err => {
            try {
              evtSource.close();
            } catch (e) {
              /* ignore cleanup errors */
            }
            reject(err);
          };
        });
      },
      {
        provider: provider || 'unknown',
        model: model || 'unknown',
        operation: `executeTaskStreaming: ${goblin} - ${task}`,
      }
    );
  }

  async onTaskStream(_callback: (payload: StreamChunk) => void) {
    /* no-op */
  }

  async setProviderApiKey(provider: string, key: string): Promise<void> {
    return trackApiCall(
      async () => {
        await api.post(`/v1/api-keys/${provider}`, { key });
      },
      `/v1/api-keys/${provider}`,
      'POST',
      { provider }
    );
  }

  // Authentication methods
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return trackApiCall(
      async () => {
        const response = await api.post<{ token: string; user: User }>('/v1/auth/login', {
          email,
          password,
        });
        return response.data;
      },
      '/v1/auth/login',
      'POST',
      { email: email.replace(/./g, '*') } // Mask email for privacy
    );
  }

  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<{ token: string; user: User }> {
    return trackApiCall(
      async () => {
        const response = await api.post<{ token: string; user: User }>('/v1/auth/register', {
          email,
          password,
          name,
        });
        return response.data;
      },
      '/v1/auth/register',
      'POST',
      { email: email.replace(/./g, '*'), name } // Mask email for privacy
    );
  }

  async logout(): Promise<void> {
    return trackApiCall(
      async () => {
        await api.post('/v1/auth/logout');
      },
      '/v1/auth/logout',
      'POST'
    );
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: User }> {
    return trackApiCall(
      async () => {
        const response = await api.post<{ valid: boolean; user?: User }>(
          '/v1/auth/validate',
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return response.data;
      },
      '/v1/auth/validate',
      'POST'
    );
  }
}
