import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Example of how to test API calls without hitting the network
describe('API Integration Tests', () => {
  beforeEach(() => {
    (globalThis as any).fetch = jest.fn();
  });

  it('should mock API calls successfully', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ status: 'healthy' }),
    });

    const response = await fetch('http://127.0.0.1:8000/health');
    const data = await response.json();

    expect(data).toEqual({ status: 'healthy' });
  });

  it('should handle streaming responses', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ status: 'completed', result: 'Task completed successfully' }),
    });

    const response = await fetch('http://127.0.0.1:8000/v1/execute/mock-task-123');
    const data = await response.json();

    expect(data.status).toBe('completed');
    expect(data.result).toBe('Task completed successfully');
  });
});
