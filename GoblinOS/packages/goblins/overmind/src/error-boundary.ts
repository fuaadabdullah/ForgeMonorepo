/**
 * 🛡️ Error Boundaries & Graceful Degradation
 *
 * Provides robust error handling and graceful degradation for missing dependencies
 * and external service failures. Ensures the system remains operational even when
 * individual components fail.
 */

import type { Logger } from 'pino'

export interface ErrorBoundaryOptions {
  /** Logger instance for error reporting */
  logger: Logger
  /** Whether to throw errors or degrade gracefully */
  strict?: boolean
  /** Fallback value to return on error */
  fallback?: unknown
  /** Custom error message */
  message?: string
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  lastChecked: Date
  responseTime?: number
}

/**
 * Generic error boundary wrapper for async operations
 */
export async function withErrorBoundary<T>(
  operation: () => Promise<T>,
  options: ErrorBoundaryOptions
): Promise<T | undefined> {
  const { logger, strict = false, fallback, message } = options

  try {
    return await operation()
  } catch (error) {
    const errorMessage =
      message || `Operation failed: ${error instanceof Error ? error.message : String(error)}`

    logger.error({
      msg: errorMessage,
      error: error instanceof Error ? error.stack : String(error),
      strict,
    })

    if (strict) {
      throw error
    }

    if (fallback !== undefined) {
      logger.warn({ msg: 'Using fallback value for failed operation', fallback })
      return fallback as T
    }

    return undefined
  }
}

/**
 * Generic error boundary wrapper for sync operations
 */
export function withErrorBoundarySync<T>(
  operation: () => T,
  options: ErrorBoundaryOptions
): T | undefined {
  const { logger, strict = false, fallback, message } = options

  try {
    return operation()
  } catch (error) {
    const errorMessage =
      message || `Operation failed: ${error instanceof Error ? error.message : String(error)}`

    logger.error({
      msg: errorMessage,
      error: error instanceof Error ? error.stack : String(error),
      strict,
    })

    if (strict) {
      throw error
    }

    if (fallback !== undefined) {
      logger.warn({ msg: 'Using fallback value for failed operation', fallback })
      return fallback as T
    }

    return undefined
  }
}

/**
 * SDK availability checker with graceful degradation
 */
export class SDKChecker {
  private logger: Logger
  private healthCache = new Map<string, ServiceHealth>()
  private cacheTimeout = 30000 // 30 seconds

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * Check if an SDK is available and working
   */
  async checkSDK(name: string, checkFn: () => Promise<boolean>): Promise<boolean> {
    const cached = this.healthCache.get(name)
    if (cached && Date.now() - cached.lastChecked.getTime() < this.cacheTimeout) {
      return cached.status === 'healthy'
    }

    const startTime = Date.now()
    let status: ServiceHealth['status'] = 'unhealthy'
    let message: string | undefined

    try {
      const available = await checkFn()
      status = available ? 'healthy' : 'degraded'
      message = available ? 'SDK available' : 'SDK not available, using fallback'
    } catch (error) {
      status = 'unhealthy'
      message = `SDK check failed: ${error instanceof Error ? error.message : String(error)}`
    }

    const health: ServiceHealth = {
      name,
      status,
      message,
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
    }

    this.healthCache.set(name, health)
    this.logger.info({ msg: `SDK health check: ${name}`, health })

    return status === 'healthy'
  }

  /**
   * Get health status for all checked services
   */
  getHealthStatus(): ServiceHealth[] {
    return Array.from(this.healthCache.values())
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache.clear()
  }
}

/**
 * Dependency injection container with error boundaries
 */
export class DependencyContainer {
  private services = new Map<string, unknown>()
  private logger: Logger
  private sdkChecker: SDKChecker

  constructor(logger: Logger) {
    this.logger = logger
    this.sdkChecker = new SDKChecker(logger)
  }

  /**
   * Register a service with optional health check
   */
  register<T>(
    name: string,
    factory: () => Promise<T> | T,
    healthCheck?: () => Promise<boolean>
  ): void {
    this.services.set(name, { factory, healthCheck })
  }

  /**
   * Get a service with error boundary
   */
  async get<T>(name: string, fallback?: T): Promise<T | undefined> {
    const service = this.services.get(name) as
      | { factory: () => Promise<T> | T; healthCheck?: () => Promise<boolean> }
      | undefined

    if (!service) {
      this.logger.error({ msg: `Service not registered: ${name}` })
      return fallback
    }

    // Check health if health check is provided
    if (service.healthCheck) {
      const healthy = await this.sdkChecker.checkSDK(name, service.healthCheck)
      if (!healthy) {
        this.logger.warn({ msg: `Service unhealthy, using fallback: ${name}` })
        return fallback
      }
    }

    // Execute factory with error boundary
    return withErrorBoundary(
      async () => {
        const result = service.factory()
        return result instanceof Promise ? await result : result
      },
      {
        logger: this.logger,
        message: `Failed to create service: ${name}`,
        fallback,
      }
    )
  }

  /**
   * Get SDK checker instance
   */
  getSDKChecker(): SDKChecker {
    return this.sdkChecker
  }
}
