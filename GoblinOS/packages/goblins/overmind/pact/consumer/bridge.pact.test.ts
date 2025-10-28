import { integer, iso8601DateTimeWithMillis, like } from '@pact-foundation/pact/src/dsl/matchers'
import axios from 'axios'
import { pactWith } from 'jest-pact'

pactWith(
  {
    consumer: 'overmind-bridge',
    provider: 'overmind-api',
    dir: './pact/pacts',
  },
  (interaction) => {
    interaction('POST /api/chat request', ({ provider, execute }) => {
      beforeEach(() => {
        provider
          .given('API is healthy and models are available')
          .uponReceiving('a chat request with routing')
          .withRequest({
            method: 'POST',
            path: '/api/chat',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              message: like('Hello, what is 2+2?'),
              model: like('gemini-pro'),
              stream: false,
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              response: like('The answer is 4'),
              model: 'gemini-pro',
              usage: {
                prompt_tokens: integer(10),
                completion_tokens: integer(5),
                total_tokens: integer(15),
              },
              cost: like(0.0001),
              provider: like('litellm'),
              timestamp: iso8601DateTimeWithMillis(),
            },
          })
      })

      execute('should receive chat response', async (mockServer) => {
        const response = await axios.post(`${mockServer.url}/api/chat`, {
          message: 'Hello, what is 2+2?',
          model: 'gemini-pro',
          stream: false,
        })

        expect(response.status).toBe(200)
        expect(response.data.response).toBeDefined()
        expect(response.data.model).toBe('gemini-pro')
        expect(response.data.usage.total_tokens).toBeGreaterThan(0)
      })
    })

    interaction('POST /api/memory/add request', ({ provider, execute }) => {
      beforeEach(() => {
        provider
          .given('Memory system is initialized')
          .uponReceiving('a request to add memory')
          .withRequest({
            method: 'POST',
            path: '/api/memory/add',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              content: like('Important information to remember'),
              importance: like(0.8),
              tags: like(['important', 'user-preference']),
            },
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: like('mem-123456'),
              content: 'Important information to remember',
              importance: 0.8,
              tags: ['important', 'user-preference'],
              tier: like('short-term'),
              created_at: iso8601DateTimeWithMillis(),
            },
          })
      })

      execute('should add memory successfully', async (mockServer) => {
        const response = await axios.post(`${mockServer.url}/api/memory/add`, {
          content: 'Important information to remember',
          importance: 0.8,
          tags: ['important', 'user-preference'],
        })

        expect(response.status).toBe(201)
        expect(response.data.id).toBeDefined()
        expect(response.data.tier).toBe('short-term')
      })
    })

    interaction('GET /api/memory/search request', ({ provider, execute }) => {
      beforeEach(() => {
        provider
          .given('Memories exist in the system')
          .uponReceiving('a search request')
          .withRequest({
            method: 'GET',
            path: '/api/memory/search',
            query: {
              q: like('user preferences'),
              limit: '10',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              results: [
                {
                  id: like('mem-123'),
                  content: like('User prefers dark mode'),
                  importance: like(0.7),
                  tier: like('working'),
                  relevance: like(0.95),
                  created_at: iso8601DateTimeWithMillis(),
                },
              ],
              total: integer(1),
            },
          })
      })

      execute('should return search results', async (mockServer) => {
        const response = await axios.get(`${mockServer.url}/api/memory/search`, {
          params: {
            q: 'user preferences',
            limit: 10,
          },
        })

        expect(response.status).toBe(200)
        expect(Array.isArray(response.data.results)).toBe(true)
        expect(response.data.total).toBeGreaterThanOrEqual(0)
      })
    })

    interaction('GET /health check', ({ provider, execute }) => {
      beforeEach(() => {
        provider
          .given('API is running')
          .uponReceiving('a health check request')
          .withRequest({
            method: 'GET',
            path: '/health',
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              status: 'healthy',
              version: like('2.0.0'),
              uptime: integer(12345),
              components: {
                memory: like('healthy'),
                litellm: like('healthy'),
              },
            },
          })
      })

      execute('should return healthy status', async (mockServer) => {
        const response = await axios.get(`${mockServer.url}/health`)

        expect(response.status).toBe(200)
        expect(response.data.status).toBe('healthy')
        expect(response.data.components).toBeDefined()
      })
    })
  }
)
