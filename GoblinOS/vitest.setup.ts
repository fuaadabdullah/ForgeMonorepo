import { vi } from 'vitest'

// Setup jsdom for React Testing Library only when needed
// This will be handled by the individual test files or vitest config
// Don't set up global DOM here to avoid interfering with OpenAI client detection

// Mock better-sqlite3 for tests
vi.mock('better-sqlite3', () => {
  const mockStatement = vi.fn().mockImplementation(() => ({
    run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
    get: vi.fn().mockReturnValue({ count: 5 }),
    all: vi.fn().mockReturnValue([
      {
        id: '1',
        content: 'test content',
        type: 'LONG_TERM',
        importance: 'HIGH',
        access_count: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
        tags: '[]',
        metadata: '{}',
      },
    ]),
    finalize: vi.fn(),
  }))

  return {
    default: vi.fn().mockImplementation(() => ({
      prepare: mockStatement,
      close: vi.fn(),
      exec: vi.fn(),
    })),
  }
})

// Mock @xenova/transformers
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(() =>
    Promise.resolve(
      vi.fn((_text: string) =>
        Promise.resolve({
          data: new Float32Array(Array.from({ length: 384 }, () => Math.random() - 0.5)),
        })
      )
    )
  ),
}))

// Mock chroma-js for tests
vi.mock('chroma-js', () => ({
  ChromaClient: vi.fn().mockImplementation(() => ({
    heartbeat: vi.fn().mockResolvedValue(true),
    createCollection: vi.fn().mockResolvedValue({
      add: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({
        ids: [['1', '2']],
        distances: [[0.1, 0.2]],
        metadatas: [[{ content: 'test' }, { content: 'test2' }]],
        documents: [['test doc', 'test doc 2']],
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      count: vi.fn().mockResolvedValue(2),
      get: vi.fn().mockResolvedValue({
        ids: ['1', '2'],
        metadatas: [{ content: 'test' }, { content: 'test2' }],
        documents: ['test doc', 'test doc 2'],
      }),
    }),
    getCollection: vi.fn().mockResolvedValue({
      add: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({
        ids: [['1', '2']],
        distances: [[0.1, 0.2]],
        metadatas: [[{ content: 'test' }, { content: 'test2' }]],
        documents: [['test doc', 'test doc 2']],
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      count: vi.fn().mockResolvedValue(2),
      get: vi.fn().mockResolvedValue({
        ids: ['1', '2'],
        metadatas: [{ content: 'test' }, { content: 'test2' }],
        documents: ['test doc', 'test doc 2'],
      }),
    }),
    listCollections: vi.fn().mockResolvedValue([]),
    deleteCollection: vi.fn().mockResolvedValue(undefined),
  })),
}))
