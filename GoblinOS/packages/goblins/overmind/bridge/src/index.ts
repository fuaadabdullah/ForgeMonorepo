/**
 * 🌉 Overmind Node.js Bridge Service
 *
 * HTTP wrapper around the TypeScript Overmind orchestrator.
 * Provides REST API for Python FastAPI backend to communicate with.
 */

import { type Overmind, createOvermind } from '@goblinos/overmind'
import axios from 'axios'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import pino from 'pino'
import pinoHttp from 'pino-http'

dotenv.config()

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
})

const app = express()
const host = process.env.OVERMIND_BRIDGE_HOST || '0.0.0.0'
const port = Number.parseInt(process.env.OVERMIND_BRIDGE_PORT || '3030')

// Middleware
app.use(cors())
app.use(express.json())
app.use(pinoHttp({ logger }))

// Initialize Overmind
let overmind: Overmind | null = null

try {
  overmind = createOvermind()
  logger.info('🧙‍♂️ Overmind initialized successfully')
} catch (error) {
  logger.error('Failed to initialize Overmind:', error)
  process.exit(1)
}

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (_req, res) => {
  if (!overmind) {
    return res.status(503).json({
      status: 'unhealthy',
      error: 'Overmind not initialized',
    })
  }

  const providers = overmind.getAvailableProviders()
  const uptime = process.uptime()

  // Check if we have any providers configured
  const hasProviders = providers.length > 0

  res.json({
    status: hasProviders ? 'healthy' : 'degraded',
    version: '0.1.0',
    uptime: Math.floor(uptime),
    providers,
    checks: {
      overmind: 'initialized',
      providers: hasProviders ? 'configured' : 'missing',
    },
  })
})

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    const result = await overmind.chat(message)

    res.json(result)
  } catch (error) {
    logger.error('Chat error:', error)
    res.status(500).json({
      error: 'Chat failed',
      message: (error as Error).message,
    })
  }
})

// Get chat history
app.get('/chat/history', (_req, res) => {
  try {
    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    const messages = overmind.getConversationHistory()
    res.json({ messages })
  } catch (error) {
    logger.error('Get history error:', error)
    res.status(500).json({ error: 'Failed to get history' })
  }
})

// Clear history
app.delete('/chat/history', (_req, res) => {
  try {
    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    overmind.resetConversation()
    res.json({ status: 'ok', message: 'History cleared' })
  } catch (error) {
    logger.error('Clear history error:', error)
    res.status(500).json({ error: 'Failed to clear history' })
  }
})

// Get providers
app.get('/providers', (_req, res) => {
  try {
    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    const providers = overmind.getAvailableProviders()
    res.json({ providers })
  } catch (error) {
    logger.error('Get providers error:', error)
    res.status(500).json({ error: 'Failed to get providers' })
  }
})

// Get routing stats
app.get('/stats', (_req, res) => {
  try {
    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    const stats = overmind.getRoutingStats()
    res.json(stats)
  } catch (error) {
    logger.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

// Memory endpoints
app.post('/memory/facts', async (req, res) => {
  try {
    const { fact, metadata } = req.body

    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    const id = await overmind.rememberFact(fact, metadata)
    res.json({ id, status: 'stored' })
  } catch (error) {
    logger.error('Store fact error:', error)
    res.status(500).json({ error: 'Failed to store fact' })
  }
})

app.get('/memory/search', async (req, res) => {
  try {
    const { query, limit } = req.query

    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    const results = await overmind.searchMemory(String(query || ''), Number(limit) || 10)

    res.json({ results })
  } catch (error) {
    logger.error('Search memory error:', error)
    res.status(500).json({ error: 'Failed to search memory' })
  }
})

app.get('/memory/stats', async (_req, res) => {
  try {
    if (!overmind) {
      return res.status(500).json({ error: 'Overmind not initialized' })
    }

    const stats = await overmind.getMemoryStats()
    res.json(stats)
  } catch (error) {
    logger.error('Get memory stats error:', error)
    res.status(500).json({ error: 'Failed to get memory stats' })
  }
})

// ============================================================================
// Smithy (Forge Guild Environment Goblin) Routes
// ============================================================================

// Smithy doctor - environment diagnostics
app.post('/smithy/doctor', async (_req, res) => {
  try {
    const smithyUrl = process.env.SMITHY_SERVICE_URL || 'http://smithy:8002'
    const response = await axios.post(`${smithyUrl}/smithy/doctor`)
    res.json(response.data)
  } catch (error) {
    logger.error('Smithy doctor error:', error)
    res.status(500).json({
      error: 'Smithy doctor failed',
      message: (error as Error).message,
    })
  }
})

// Smithy bootstrap - environment setup
app.post('/smithy/bootstrap', async (_req, res) => {
  try {
    const smithyUrl = process.env.SMITHY_SERVICE_URL || 'http://smithy:8002'
    const response = await axios.post(`${smithyUrl}/smithy/bootstrap`)
    res.json(response.data)
  } catch (error) {
    logger.error('Smithy bootstrap error:', error)
    res.status(500).json({
      error: 'Smithy bootstrap failed',
      message: (error as Error).message,
    })
  }
})

// Smithy sync config - .env sync
app.post('/smithy/sync-config', async (_req, res) => {
  try {
    const smithyUrl = process.env.SMITHY_SERVICE_URL || 'http://smithy:8002'
    const response = await axios.post(`${smithyUrl}/smithy/sync-config`)
    res.json(response.data)
  } catch (error) {
    logger.error('Smithy sync-config error:', error)
    res.status(500).json({
      error: 'Smithy sync-config failed',
      message: (error as Error).message,
    })
  }
})

// Smithy check - lint + test
app.post('/smithy/check', async (_req, res) => {
  try {
    const smithyUrl = process.env.SMITHY_SERVICE_URL || 'http://smithy:8002'
    const response = await axios.post(`${smithyUrl}/smithy/check`)
    res.json(response.data)
  } catch (error) {
    logger.error('Smithy check error:', error)
    res.status(500).json({
      error: 'Smithy check failed',
      message: (error as Error).message,
    })
  }
})

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(port, host, () => {
  logger.info(`🌉 Overmind Bridge listening on ${host}:${port}`)
  logger.info(`Health check: http://localhost:${port}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  overmind?.shutdown()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...')
  overmind?.shutdown()
  process.exit(0)
})
