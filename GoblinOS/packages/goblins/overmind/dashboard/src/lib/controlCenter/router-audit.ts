import { parse } from 'yaml'
import rawConfig from '../../../../../../../../goblins.yaml?raw'
import { type RouterAuditLog, logRouterAudit } from '../controlCenter/api'

type GuildId = RouterAuditLog['guild']
type KpiProperty = keyof NonNullable<RouterAuditLog['kpi']>

type LiteBrainConfig = {
  local?: string[]
  routers?: string[]
}

type GuildConfig = {
  id: string
  charter: string
  members: Array<{
    id: string
    litebrain: LiteBrainConfig
  }>
}

type RegistrySnapshot = {
  guilds: GuildConfig[]
}

interface GuildTelemetryMeta {
  id: GuildId
  charterSummary: string
  fallbackChain: string[]
  defaultKpi?: { property: KpiProperty; registryKey?: string }
}

const KPI_FIELD_MAP: Record<GuildId, GuildTelemetryMeta['defaultKpi']> = {
  forge: { property: 'buildTime', registryKey: 'p95_build_time' },
  crafters: { property: 'cls', registryKey: 'cls_budget' },
  keepers: { property: 'securityScore', registryKey: 'security_scan_coverage' },
  huntress: { property: 'testCoverage', registryKey: 'test_flakiness_rate' },
  mages: { property: 'qualityScore', registryKey: 'lint_compliance' },
}

const registryData = parse(rawConfig) as RegistrySnapshot
const guildMeta = new Map<GuildId, GuildTelemetryMeta>()

registryData.guilds.forEach((guild) => {
  if (!isValidGuildId(guild.id)) return

  guildMeta.set(guild.id, {
    id: guild.id,
    charterSummary: summarizeCharter(guild.charter),
    fallbackChain: buildFallbackChain(guild),
    defaultKpi: KPI_FIELD_MAP[guild.id],
  })
})

function ensureGuildMeta(guild: GuildId): GuildTelemetryMeta {
  const meta = guildMeta.get(guild)
  if (!meta) {
    throw new Error(`Guild ${guild} metadata not found in registry snapshot`)
  }
  return meta
}

function summarizeCharter(charter: string): string {
  const normalized = charter
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')

  const firstSentenceMatch = normalized.match(/([^.!?]+[.!?])/)
  return firstSentenceMatch ? firstSentenceMatch[1].trim() : normalized
}

function buildFallbackChain(guild: GuildConfig): string[] {
  const models = new Set<string>()
  guild.members.forEach((member) => {
    member.litebrain.local?.forEach((model) => models.add(model))
    member.litebrain.routers?.forEach((router) => models.add(mapRouterToModel(router)))
  })
  return Array.from(models)
}

function mapRouterToModel(router: string): string {
  switch (router) {
    case 'openai':
      return 'gpt-4-turbo'
    case 'gemini':
      return 'gemini-pro'
    default:
      return router
  }
}

function isValidGuildId(value: string): value is GuildId {
  return ['forge', 'crafters', 'keepers', 'huntress', 'mages'].includes(value)
}

function buildKpiPayload(
  guild: GuildId,
  metricValue?: number,
  metricOverride?: { property: KpiProperty; registryKey?: string }
): RouterAuditLog['kpi'] | undefined {
  if (metricValue === undefined) return undefined

  const { property } = metricOverride ?? ensureGuildMeta(guild).defaultKpi ?? {}
  if (!property) return undefined

  return { [property]: metricValue } as RouterAuditLog['kpi']
}

export class RouterAuditLogger {
  private static instance: RouterAuditLogger
  private sessionId: string

  private constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  static getInstance(): RouterAuditLogger {
    if (!RouterAuditLogger.instance) {
      RouterAuditLogger.instance = new RouterAuditLogger()
    }
    return RouterAuditLogger.instance
  }

  async logRouterDecision(log: Omit<RouterAuditLog, 'sessionId' | 'timestamp'>): Promise<void> {
    const meta = ensureGuildMeta(log.guild)
    try {
      const auditLog: RouterAuditLog = {
        ...log,
        routingReason: log.routingReason || meta.charterSummary,
        fallbackChain: log.fallbackChain.length ? log.fallbackChain : meta.fallbackChain,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      }

      await logRouterAudit(auditLog)
      console.log('🔄 Router Audit:', auditLog)
    } catch (error) {
      console.error('Failed to log router audit:', error)
    }
  }

  async logForgeDecision(
    task: string,
    liteBrain: string,
    buildTimeMs?: number,
    success = true,
    error?: string
  ): Promise<void> {
    await this.logGuildDecision('forge', {
      task,
      liteBrain,
      metricValue: buildTimeMs,
      success,
      error,
    })
  }

  async logCraftersDecision(
    task: string,
    liteBrain: string,
    cls?: number,
    success = true,
    error?: string
  ): Promise<void> {
    await this.logGuildDecision('crafters', {
      task,
      liteBrain,
      metricValue: cls,
      success,
      error,
      metricOverride: { property: 'cls', registryKey: 'cls_budget' },
    })
  }

  async logKeepersDecision(
    task: string,
    liteBrain: string,
    securityScore?: number,
    success = true,
    error?: string
  ): Promise<void> {
    await this.logGuildDecision('keepers', {
      task,
      liteBrain,
      metricValue: securityScore,
      success,
      error,
    })
  }

  async logHuntressDecision(
    task: string,
    liteBrain: string,
    detectionRate?: number,
    success = true,
    error?: string
  ): Promise<void> {
    await this.logGuildDecision('huntress', {
      task,
      liteBrain,
      metricValue: detectionRate,
      success,
      error,
      metricOverride: { property: 'testCoverage', registryKey: 'test_flakiness_rate' },
    })
  }

  async logMagesDecision(
    task: string,
    liteBrain: string,
    qualityScore?: number,
    success = true,
    error?: string
  ): Promise<void> {
    await this.logGuildDecision('mages', {
      task,
      liteBrain,
      metricValue: qualityScore,
      success,
      error,
    })
  }

  async logEscalation(
    guild: GuildId,
    task: string,
    escalationTrigger: string,
    currentLiteBrain: string
  ): Promise<void> {
    await this.logGuildDecision(guild, {
      task,
      liteBrain: currentLiteBrain,
      routingReason: `Escalation triggered: ${escalationTrigger}`,
      escalationTrigger,
      success: true,
    })
  }

  async logPolicyViolation(guild: GuildId, task: string, violation: string): Promise<void> {
    await this.logGuildDecision(guild, {
      task,
      liteBrain: 'blocked',
      routingReason: `Policy violation: ${violation}`,
      success: false,
      error: violation,
      fallbackOverride: [],
    })
  }

  private async logGuildDecision(
    guild: GuildId,
    options: {
      task: string
      liteBrain: string
      metricValue?: number
      success: boolean
      error?: string
      routingReason?: string
      metricOverride?: { property: KpiProperty; registryKey?: string }
      escalationTrigger?: string
      fallbackOverride?: string[]
    }
  ): Promise<void> {
    const meta = ensureGuildMeta(guild)
    await this.logRouterDecision({
      guild,
      task: options.task,
      liteBrain: options.liteBrain,
      routingReason: options.routingReason ?? meta.charterSummary,
      fallbackChain: options.fallbackOverride ?? meta.fallbackChain,
      kpi: buildKpiPayload(guild, options.metricValue, options.metricOverride),
      success: options.success,
      error: options.error,
      escalationTrigger: options.escalationTrigger,
    })
  }
}

export const routerAuditLogger = RouterAuditLogger.getInstance()
