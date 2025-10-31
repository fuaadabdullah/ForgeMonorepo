/**
 * RAG Pipeline Examples - Complete Usage Guide
 *
 * Demonstrates end-to-end RAG workflow:
 * 1. Document ingestion and chunking
 * 2. Embedding generation
 * 3. Vector store population
 * 4. Query retrieval and context injection
 * 5. RAG-enabled chat
 *
 * @module rag/examples
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import {
  chunkMarkdown,
  chunkText,
  createVectorStore,
  embed,
  embedBatch,
  ragChat,
  retrieve,
} from './index.js'

/**
 * Example 1: Ingest and search documentation
 */
export async function documentationExample() {
  console.log('=== Documentation RAG Example ===\n')

  // Step 1: Create vector store
  const store = createVectorStore()

  // Step 2: Sample documentation
  const docs = [
    {
      id: 'routing-doc',
      content: `# Routing Strategies

Overmind supports multiple routing strategies:

- **COST_OPTIMIZED**: Selects the cheapest provider for each request
- **LATENCY_OPTIMIZED**: Chooses the fastest provider
- **LOCAL_FIRST**: Prefers local Ollama models when available
- **CASCADING**: Starts with cheap providers, escalates to more capable models if needed

Each strategy considers provider health, capabilities, and user preferences.`,
    },
    {
      id: 'providers-doc',
      content: `# Supported Providers

Overmind integrates with four LLM providers:

1. **Ollama** (Local): llama3.1, qwen2.5-coder:7b, nomic-embed-text
   - Zero cost, full privacy, slower inference

2. **DeepSeek**: deepseek-chat, deepseek-coder
   - Lowest cost cloud option, 800ms average latency

3. **Gemini**: gemini-2.0-flash-exp, gemini-1.5-pro
   - Best for creative tasks and vision, 1200ms latency

4. **OpenAI**: gpt-4o, gpt-4o-mini
   - Highest quality, highest cost, 1500ms latency`,
    },
  ]

  // Step 3: Chunk documents
  const allChunks = docs.flatMap((doc) => chunkMarkdown(doc.content, { chunkSize: 300 }, doc.id))

  console.log(`Created ${allChunks.length} chunks from ${docs.length} documents\n`)

  // Step 4: Generate embeddings and add to store
  console.log('Generating embeddings...')
  const embeddings = await embedBatch(
    allChunks.map((c) => c.content),
    { provider: 'ollama', cache: true }
  )

  for (let i = 0; i < allChunks.length; i++) {
    store.add({
      id: allChunks[i].id,
      content: allChunks[i].content,
      embedding: embeddings[i].vector,
      metadata: allChunks[i].metadata,
      timestamp: Date.now(),
    })
  }

  console.log('Vector store populated\n')

  // Step 5: Query the store
  const query = 'What are the local-first routing options?'
  console.log(`Query: "${query}"\n`)

  const result = await retrieve(query, store, {
    embedding: { provider: 'ollama', cache: true },
    search: { k: 3, minScore: 0.3 },
    maxContextLength: 1000,
    includeScores: true,
  })

  console.log('Retrieved Context:')
  console.log(result.context)
  console.log(`\nTokens: ~${result.tokensApprox}`)
  console.log(`Results: ${result.results.length}`)

  // Step 6: Use with LLM
  const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: query }]

  const ragResult = await ragChat(query, store, messages, {
    embedding: { provider: 'ollama', cache: true },
    search: { k: 2 },
    contextFormat: 'system',
  })

  console.log('\nRAG-enabled chat messages:', ragResult.messages.length)
  console.log('Context injected as:', ragResult.retrieval.context ? 'system message' : 'none')
}

/**
 * Example 2: Code documentation RAG
 */
export async function codeDocumentationExample() {
  console.log('\n=== Code Documentation RAG Example ===\n')

  const store = createVectorStore()

  // Sample code documentation
  const codeDocs = [
    {
      id: 'ollama-client',
      content: `## Ollama Native Client

\`\`\`typescript
import { chatOllamaStructured } from './clients/ollama-native';

const response = await chatOllamaStructured({
  prompt: 'Extract person info',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    }
  }
});
\`\`\`

The \`chatOllamaStructured\` function uses Ollama's JSON Schema support to ensure type-safe responses.`,
    },
    {
      id: 'litellm-proxy',
      content: `## LiteLLM Proxy Client

\`\`\`typescript
import { selectModel, chatLiteLLM } from './clients/litellm-proxy';

const model = selectModel({
  taskType: 'code',
  requireJSON: true,
  offlineOnly: false
});

const response = await chatLiteLLM(messages, { taskType: 'code' });
\`\`\`

Smart model selection routes code tasks to qwen2.5-coder:7b or deepseek-coder.`,
    },
  ]

  // Chunk and embed
  const chunks = codeDocs.flatMap((doc) => chunkText(doc.content, { chunkSize: 400 }, doc.id))

  const embeddings = await embedBatch(
    chunks.map((c) => c.content),
    { provider: 'ollama', cache: true }
  )

  for (let i = 0; i < chunks.length; i++) {
    store.add({
      id: chunks[i].id,
      content: chunks[i].content,
      embedding: embeddings[i].vector,
      metadata: chunks[i].metadata,
      timestamp: Date.now(),
    })
  }

  // Query for code examples
  const query = 'How do I use structured outputs with type safety?'

  const result = await retrieve(query, store, {
    embedding: { provider: 'ollama', cache: true },
    search: { k: 2 },
    includeScores: true,
  })

  console.log(`Query: "${query}"\n`)
  console.log('Top results:')
  for (const r of result.results) {
    console.log(`- Score ${r.score.toFixed(3)}: ${r.document.content.slice(0, 60)}...`)
  }
}

/**
 * Example 3: Persistent vector store
 */
export async function persistenceExample() {
  console.log('\n=== Vector Store Persistence Example ===\n')

  // Create and populate store
  const store = createVectorStore()

  const docs = [
    'Overmind Phase 3 adds Ollama integration',
    'Local-first routing reduces API costs',
    'Tool calling enables function execution',
  ]

  const embeddings = await embedBatch(docs, {
    provider: 'ollama',
    cache: true,
  })

  for (let i = 0; i < docs.length; i++) {
    store.add({
      id: `doc-${i}`,
      content: docs[i],
      embedding: embeddings[i].vector,
      metadata: { index: i },
      timestamp: Date.now(),
    })
  }

  console.log('Store populated with', store.size(), 'documents')

  // Save to JSON
  const json = store.toJSON()
  console.log('Serialized to JSON:', json.length, 'bytes')

  // Load into new store
  const newStore = createVectorStore()
  newStore.fromJSON(json)
  console.log('Loaded into new store:', newStore.size(), 'documents')

  // Verify by searching
  const queryEmb = await embed('Ollama local inference', {
    provider: 'ollama',
    cache: true,
  })

  const results = newStore.search(queryEmb.vector, { k: 1 })
  console.log('\nTop result:', results[0].document.content)
  console.log('Score:', results[0].score.toFixed(3))
}

/**
 * Example 4: Metadata filtering
 */
export async function filteringExample() {
  console.log('\n=== Metadata Filtering Example ===\n')

  const store = createVectorStore()

  // Documents with metadata
  const docs = [
    { text: 'Python FastAPI backend', tags: ['python', 'backend'] },
    { text: 'TypeScript React frontend', tags: ['typescript', 'frontend'] },
    { text: 'TypeScript Node.js bridge', tags: ['typescript', 'backend'] },
  ]

  const embeddings = await embedBatch(
    docs.map((d) => d.text),
    { provider: 'ollama', cache: true }
  )

  for (let i = 0; i < docs.length; i++) {
    store.add({
      id: `doc-${i}`,
      content: docs[i].text,
      embedding: embeddings[i].vector,
      metadata: { tags: docs[i].tags },
      timestamp: Date.now(),
    })
  }

  // Query with filter for backend only
  const queryEmb = await embed('API server implementation', {
    provider: 'ollama',
    cache: true,
  })

  const backendResults = store.search(queryEmb.vector, {
    k: 5,
    filter: (doc) => {
      const tags = doc.metadata?.tags as string[] | undefined
      return tags?.includes('backend') ?? false
    },
  })

  console.log('Backend-only results:')
  for (const r of backendResults) {
    console.log(`- ${r.document.content} (${r.score.toFixed(3)})`)
  }
}

/**
 * Run all RAG examples
 */
export async function runAllRAGExamples() {
  await documentationExample()
  await codeDocumentationExample()
  await persistenceExample()
  await filteringExample()
}

// Uncomment to run:
// runAllRAGExamples().catch(console.error);
