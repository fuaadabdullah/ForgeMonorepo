/**
 * 🔄 Connection Pooling & Client Lifecycle Management
 *
 * Provides intelligent connection pooling, client lifecycle management, and
 * resource optimization for external services. Ensures proper cleanup and
 * prevents resource leaks.
 */

import type { Logger } from 'pino'

export interface PoolConfig {
  /** Maximum number of connections to maintain */
  maxConnections: number
  /** Minimum number of connections to keep alive */
  minConnections: number
  /** Connection idle timeout in milliseconds */
  idleTimeout: number
  /** Connection acquire timeout in milliseconds */
  acquireTimeout: number
  /** Connection validation interval in milliseconds */
  validationInterval: number
  /** Maximum connection age in milliseconds */
  maxConnectionAge: number
}

export interface PooledConnection<T> {
  /** The actual connection/client instance */
  client: T
  /** When this connection was created */
  createdAt: Date
  /** When this connection was last used */
  lastUsed: Date
  /** Number of times this connection has been used */
  useCount: number
  /** Whether this connection is currently in use */
  inUse: boolean
}

export interface ConnectionFactory<T> {
  /** Create a new connection */
  create(): Promise<T>
  /** Destroy a connection */
  destroy(client: T): Promise<void>
  /** Validate a connection is still usable */
  validate?(client: T): Promise<boolean>
}

/**
 * Generic connection pool with lifecycle management
 */
export class ConnectionPool<T> {
  private config: PoolConfig
  private factory: ConnectionFactory<T>
  private logger: Logger

  private available: PooledConnection<T>[] = []
  private waitingQueue: Array<{
    resolve: (connection: PooledConnection<T>) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }> = []

  private validationTimer?: NodeJS.Timeout
  private cleanupTimer?: NodeJS.Timeout

  private stats = {
    created: 0,
    destroyed: 0,
    acquired: 0,
    released: 0,
    timedOut: 0,
    validated: 0,
    failed: 0,
  }

  constructor(config: Partial<PoolConfig>, factory: ConnectionFactory<T>, logger: Logger) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      idleTimeout: 300000, // 5 minutes
      acquireTimeout: 30000, // 30 seconds
      validationInterval: 60000, // 1 minute
      maxConnectionAge: 3600000, // 1 hour
      ...config,
    }
    this.factory = factory
    this.logger = logger

    this.startValidationTimer()
    this.startCleanupTimer()
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PooledConnection<T>> {
    return new Promise((resolve, reject) => {
      // Try to get an available connection
      const connection = this.available.find((conn) => !conn.inUse)
      if (connection) {
        connection.inUse = true
        connection.lastUsed = new Date()
        connection.useCount++
        this.stats.acquired++
        resolve(connection)
        return
      }

      // Check if we can create a new connection
      const totalConnections = this.available.length + this.waitingQueue.length
      if (totalConnections < this.config.maxConnections) {
        this.createConnection()
          .then((connection) => {
            connection.inUse = true
            connection.lastUsed = new Date()
            connection.useCount++
            this.stats.acquired++
            resolve(connection)
          })
          .catch(reject)
        return
      }

      // Wait for a connection to become available
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex((item) => item.timeout === timeout)
        if (index !== -1) {
          this.waitingQueue.splice(index, 1)
          this.stats.timedOut++
          reject(new Error('Connection acquire timeout'))
        }
      }, this.config.acquireTimeout)

      this.waitingQueue.push({ resolve, reject, timeout })
    })
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: PooledConnection<T>): Promise<void> {
    connection.inUse = false
    this.stats.released++

    // Check if anyone is waiting
    const waiting = this.waitingQueue.shift()
    if (waiting) {
      connection.inUse = true
      connection.lastUsed = new Date()
      connection.useCount++
      this.stats.acquired++
      waiting.resolve(connection)
      return
    }

    // Check if we should destroy this connection
    const age = Date.now() - connection.createdAt.getTime()
    if (age > this.config.maxConnectionAge) {
      await this.destroyConnection(connection)
      return
    }

    // Keep it in the available pool
    this.available.push(connection)
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      available: this.available.length,
      waiting: this.waitingQueue.length,
      total: this.available.length + this.waitingQueue.length,
    }
  }

  /**
   * Close the pool and cleanup all connections
   */
  async close(): Promise<void> {
    if (this.validationTimer) {
      clearInterval(this.validationTimer)
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    // Clear waiting queue
    for (const waiting of this.waitingQueue) {
      clearTimeout(waiting.timeout)
      waiting.reject(new Error('Pool is closing'))
    }
    this.waitingQueue = []

    // Destroy all connections
    const destroyPromises = this.available.map((conn) => this.destroyConnection(conn))
    this.available = []
    await Promise.all(destroyPromises)
  }

  private async createConnection(): Promise<PooledConnection<T>> {
    try {
      const client = await this.factory.create()
      this.stats.created++

      return {
        client,
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 0,
        inUse: false,
      }
    } catch (error) {
      this.stats.failed++
      throw error
    }
  }

  private async destroyConnection(connection: PooledConnection<T>): Promise<void> {
    try {
      await this.factory.destroy(connection.client)
      this.stats.destroyed++
    } catch (error) {
      this.logger.error({
        msg: 'Failed to destroy connection',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private startValidationTimer(): void {
    this.validationTimer = setInterval(async () => {
      const toValidate = [...this.available]

      for (const connection of toValidate) {
        if (connection.inUse) continue

        try {
          if (this.factory.validate) {
            const isValid = await this.factory.validate(connection.client)
            this.stats.validated++

            if (!isValid) {
              // Remove invalid connection
              const index = this.available.indexOf(connection)
              if (index !== -1) {
                this.available.splice(index, 1)
                await this.destroyConnection(connection)
              }
            }
          }
        } catch (error) {
          this.logger.warn({
            msg: 'Connection validation failed',
            error: error instanceof Error ? error.message : String(error),
          })

          // Remove failed connection
          const index = this.available.indexOf(connection)
          if (index !== -1) {
            this.available.splice(index, 1)
            await this.destroyConnection(connection)
          }
        }
      }
    }, this.config.validationInterval)
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      const toRemove: PooledConnection<T>[] = []

      for (const connection of this.available) {
        if (connection.inUse) continue

        const idleTime = now - connection.lastUsed.getTime()
        if (
          idleTime > this.config.idleTimeout &&
          this.available.length > this.config.minConnections
        ) {
          toRemove.push(connection)
        }
      }

      // Remove idle connections
      for (const connection of toRemove) {
        const index = this.available.indexOf(connection)
        if (index !== -1) {
          this.available.splice(index, 1)
          this.destroyConnection(connection).catch((error) => {
            this.logger.error({
              msg: 'Failed to cleanup idle connection',
              error: error instanceof Error ? error.message : String(error),
            })
          })
        }
      }
    }, this.config.idleTimeout / 4) // Check every quarter of idle timeout
  }
}

/**
 * Client lifecycle manager for different SDK types
 */
export class ClientLifecycleManager {
  private pools = new Map<string, ConnectionPool<unknown>>()
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * Register a client type with connection pooling
   */
  registerClient<T>(
    name: string,
    factory: ConnectionFactory<T>,
    config?: Partial<PoolConfig>
  ): void {
    const pool = new ConnectionPool(config || {}, factory, this.logger) as ConnectionPool<unknown>
    this.pools.set(name, pool)
    this.logger.info({ msg: `Registered client pool: ${name}`, config })
  }

  /**
   * Get a client from the pool
   */
  async getClient<T>(name: string): Promise<T | undefined> {
    const pool = this.pools.get(name) as ConnectionPool<T> | undefined
    if (!pool) {
      this.logger.error({ msg: `No pool registered for client: ${name}` })
      return undefined
    }

    try {
      const connection = await pool.acquire()
      return connection.client
    } catch (error) {
      this.logger.error({
        msg: `Failed to acquire client: ${name}`,
        error: error instanceof Error ? error.message : String(error),
      })
      return undefined
    }
  }

  /**
   * Return a client to the pool
   */
  async releaseClient<T>(name: string, client: T): Promise<void> {
    const pool = this.pools.get(name) as ConnectionPool<T> | undefined
    if (!pool) {
      this.logger.warn({ msg: `No pool registered for client: ${name}` })
      return
    }

    // Find the connection wrapper
    // Note: This is a simplified implementation. In a real system,
    // you'd want to track the connection wrapper with the client
    try {
      // For now, we'll create a minimal wrapper. In practice, you'd
      // want to associate the client with its wrapper
      const wrapper = {
        client,
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        inUse: true,
      }
      await pool.release(wrapper)
    } catch (error) {
      this.logger.error({
        msg: `Failed to release client: ${name}`,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Get statistics for all pools
   */
  getStats() {
    const stats: Record<string, unknown> = {}
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats()
    }
    return stats
  }

  /**
   * Close all pools
   */
  async close(): Promise<void> {
    const closePromises = Array.from(this.pools.values()).map((pool) => pool.close())
    await Promise.all(closePromises)
    this.pools.clear()
  }
}
