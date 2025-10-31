import type { ConnectionPool } from './connection-pool.js'

/**
 * 🩺 Health Checks & Startup Validation
 *
 * Lightweight, typed health-check utilities used at startup and runtime.
 */

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  message: string
  timestamp?: Date
  details?: Record<string, unknown>
}

export interface HealthCheck {
  name: string
  check: () => Promise<HealthCheckResult>
  timeout?: number
  critical?: boolean
}

export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map()
  private results: Map<string, HealthCheckResult> = new Map()

  register(check: HealthCheck): void {
    this.checks.set(check.name, check)
  }

  async runAll(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>()

    for (const [, check] of this.checks) {
      try {
        const result = await this.runCheck(check)
        results.set(check.name, result)
        this.results.set(check.name, result)
      } catch (error) {
        const errorResult: HealthCheckResult = {
          status: 'unhealthy',
          message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        }
        results.set(check.name, errorResult)
        this.results.set(check.name, errorResult)
      }
    }

    return results
  }

  async runCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const timeout = check.timeout ?? 30000 // 30s default

    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error(`Health check '${check.name}' timed out after ${timeout}ms`))
      }, timeout)

      check
        .check()
        .then((result) => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  getResults(): Map<string, HealthCheckResult> {
    return new Map(this.results)
  }

  getResult(name: string): HealthCheckResult | undefined {
    return this.results.get(name)
  }

  getCriticalFailures(): HealthCheckResult[] {
    const failures: HealthCheckResult[] = []
    for (const [name, result] of this.results) {
      const check = this.checks.get(name)
      if (check?.critical && result.status === 'unhealthy') {
        failures.push(result)
      }
    }
    return failures
  }
}

/**
 * StandardHealthChecks: a collection of commonly used health checks.
 * Exported as an object (functions) to avoid static-only-class lint rules.
 */
export const StandardHealthChecks = {
  openai(connectionPool: ConnectionPool<any>): HealthCheck {
    return {
      name: 'openai',
      check: async (): Promise<HealthCheckResult> => {
        try {
          const pooled = await connectionPool.acquire()
          try {
            // Basic probe: attempt to list models (SDK-specific)
            if (typeof pooled.client.models?.list === 'function') {
              await pooled.client.models.list()
            }
            return { status: 'healthy', message: 'OpenAI API accessible', timestamp: new Date() }
          } finally {
            connectionPool.release(pooled)
          }
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `OpenAI check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.message : String(error) },
          }
        }
      },
      timeout: 10000,
      critical: true,
    }
  },

  ollama(connectionPool: ConnectionPool<any>): HealthCheck {
    return {
      name: 'ollama',
      check: async (): Promise<HealthCheckResult> => {
        try {
          const pooled = await connectionPool.acquire()
          try {
            const resp = await pooled.client.list?.()
            const modelCount = Array.isArray((resp as any)?.models)
              ? (resp as any).models.length
              : 0
            return {
              status: 'healthy',
              message: 'Ollama service running',
              timestamp: new Date(),
              details: { modelCount },
            }
          } finally {
            connectionPool.release(pooled)
          }
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `Ollama check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.message : String(error) },
          }
        }
      },
      timeout: 5000,
      critical: false,
    }
  },

  database(connectionString?: string): HealthCheck {
    return {
      name: 'database',
      check: async (): Promise<HealthCheckResult> => {
        try {
          if (!connectionString) {
            return {
              status: 'degraded',
              message: 'DB connection string not configured',
              timestamp: new Date(),
            }
          }
          if (connectionString.includes('postgresql://') || connectionString.includes('mysql://')) {
            return {
              status: 'healthy',
              message: 'Database connection configured',
              timestamp: new Date(),
            }
          }
          return {
            status: 'unhealthy',
            message: 'Invalid DB connection string',
            timestamp: new Date(),
          }
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `Database check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.message : String(error) },
          }
        }
      },
      timeout: 5000,
      critical: true,
    }
  },

  redis(connectionString?: string): HealthCheck {
    return {
      name: 'redis',
      check: async (): Promise<HealthCheckResult> => {
        try {
          if (!connectionString) {
            return {
              status: 'degraded',
              message: 'Redis connection string not configured',
              timestamp: new Date(),
            }
          }
          if (connectionString.startsWith('redis://') || connectionString.startsWith('rediss://')) {
            return {
              status: 'healthy',
              message: 'Redis connection configured',
              timestamp: new Date(),
            }
          }
          return {
            status: 'unhealthy',
            message: 'Invalid Redis connection string',
            timestamp: new Date(),
          }
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `Redis check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.message : String(error) },
          }
        }
      },
      timeout: 3000,
      critical: false,
    }
  },

  httpEndpoint(url: string, name?: string): HealthCheck {
    return {
      name: name ?? `http-${url}`,
      check: async (): Promise<HealthCheckResult> => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          try {
            const response = await fetch(url, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (response.ok) {
              return {
                status: 'healthy',
                message: `HTTP ${url} reachable`,
                timestamp: new Date(),
                details: { statusCode: response.status },
              }
            }
            return {
              status: 'unhealthy',
              message: `HTTP ${url} returned ${response.status}`,
              timestamp: new Date(),
              details: { statusCode: response.status },
            }
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        } catch (error) {
          return {
            status: 'unhealthy',
            message: `HTTP check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.message : String(error) },
          }
        }
      },
      timeout: 5000,
      critical: false,
    }
  },
} as const
