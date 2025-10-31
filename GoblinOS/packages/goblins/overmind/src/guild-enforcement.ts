/**
 * 🛡️ Guild LiteBrain Enforcement
 *
 * Enforces that each goblin only uses their designated litebrain models
 * as defined in goblins.yaml. Prevents cross-guild brain usage and ensures
 * compliance with guild charter routing policies.
 *
 * @module @goblinos/overmind/guild-enforcement
 */

import { readFileSync } from 'node:fs'
import { load as loadYaml } from 'js-yaml'
import { LLMProvider } from './types.js'

export interface LiteBrainConfig {
  local: string[]
  routers: string[]
  embeddings?: string[]
  temperature?: number
  analytics_tag?: string
}

export interface GuildLiteBrainMap {
  [guildId: string]: {
    [goblinId: string]: LiteBrainConfig
  }
}

/**
 * Load guild litebrain configuration from goblins.yaml
 */
export function loadGuildLiteBrainConfig(configPath = './goblins.yaml'): GuildLiteBrainMap {
  try {
    const configContent = readFileSync(configPath, 'utf-8')
    const config = loadYaml(configContent) as any

    const guildMap: GuildLiteBrainMap = {}

    if (config.guilds) {
      for (const guild of config.guilds) {
        guildMap[guild.id] = {}

        if (guild.members) {
          for (const member of guild.members) {
            if (member.litebrain) {
              guildMap[guild.id][member.id] = member.litebrain
            }
          }
        }
      }
    }

    return guildMap
  } catch (error) {
    throw new Error(`Failed to load guild litebrain config: ${(error as Error).message}`)
  }
}

/**
 * Validate that a goblin is using an allowed litebrain
 */
export function validateGoblinLiteBrain(
  guildId: string,
  goblinId: string,
  requestedProvider: LLMProvider,
  requestedModel: string,
  guildConfig: GuildLiteBrainMap
): { valid: boolean; error?: string } {
  const guildBrains = guildConfig[guildId]
  if (!guildBrains) {
    return { valid: false, error: `Unknown guild: ${guildId}` }
  }

  const goblinBrain = guildBrains[goblinId]
  if (!goblinBrain) {
    return { valid: false, error: `Unknown goblin: ${goblinId} in guild ${guildId}` }
  }

  // Check local models
  const allowedLocalModels = goblinBrain.local || []
  if (requestedProvider === LLMProvider.OLLAMA && allowedLocalModels.includes(requestedModel)) {
    return { valid: true }
  }

  // Check router models
  const allowedRouters = goblinBrain.routers || []
  const providerName = requestedProvider.toLowerCase()
  if (allowedRouters.some((router) => router.toLowerCase().includes(providerName))) {
    return { valid: true }
  }

  // Check embeddings (for RAG operations)
  const allowedEmbeddings = goblinBrain.embeddings || []
  if (allowedEmbeddings.includes(requestedModel)) {
    return { valid: true }
  }

  return {
    valid: false,
    error: `Goblin ${goblinId} in guild ${guildId} is not authorized to use ${requestedProvider}/${requestedModel}. Allowed: local=${allowedLocalModels.join(',')}, routers=${allowedRouters.join(',')}, embeddings=${allowedEmbeddings.join(',')}`,
  }
}

/**
 * Get allowed litebrains for a specific goblin
 */
export function getAllowedLiteBrains(
  guildId: string,
  goblinId: string,
  guildConfig: GuildLiteBrainMap
): LiteBrainConfig | null {
  const guildBrains = guildConfig[guildId]
  if (!guildBrains) return null

  return guildBrains[goblinId] || null
}

/**
 * Guild LiteBrain Enforcer class
 */
export class GuildLiteBrainEnforcer {
  private guildConfig: GuildLiteBrainMap
  private configPath: string

  constructor(configPath = './goblins.yaml') {
    this.configPath = configPath
    this.guildConfig = loadGuildLiteBrainConfig(configPath)
  }

  /**
   * Reload configuration (useful for testing or config updates)
   */
  reloadConfig(): void {
    this.guildConfig = loadGuildLiteBrainConfig(this.configPath)
  }

  /**
   * Validate a goblin's litebrain usage
   */
  validate(
    guildId: string,
    goblinId: string,
    requestedProvider: LLMProvider,
    requestedModel: string
  ): { valid: boolean; error?: string } {
    return validateGoblinLiteBrain(
      guildId,
      goblinId,
      requestedProvider,
      requestedModel,
      this.guildConfig
    )
  }

  /**
   * Get allowed litebrains for a goblin
   */
  getAllowedBrains(guildId: string, goblinId: string): LiteBrainConfig | null {
    return getAllowedLiteBrains(guildId, goblinId, this.guildConfig)
  }

  /**
   * Get all guilds and their goblins
   */
  getGuildStructure(): GuildLiteBrainMap {
    return { ...this.guildConfig }
  }
}
