import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { describe, it } from 'vitest';

const { like } = MatchersV3;

describe('ForgeTM Frontend - Pact Contract Tests', () => {
  const provider = new PactV3({
    consumer: 'ForgeTM-Frontend',
    provider: 'ForgeTM-Backend',
    port: 1234,
  });

  it('returns a hello message', () => {
    provider
      .given('the backend is running')
      .uponReceiving('a request for hello message')
      .withRequest({
        method: 'POST',
        path: '/api/trpc/hello',
        body: { name: 'World' },
      })
      .willRespondWith({
        status: 200,
        body: like({ message: 'Hello World!' }),
      });

    return provider.executeTest(async (mockserver) => {
      // Test the tRPC client against the mock
      const response = await fetch(`${mockserver.url}/api/trpc/hello`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'World' }),
      });
      const data = await response.json();
      expect(data.message).toBe('Hello World!');
    });
  });
});
