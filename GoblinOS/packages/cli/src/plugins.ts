import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import type { Goblin } from './types.js'

export async function loadPlugins(
  root = path.resolve(process.cwd(), 'GoblinOS')
): Promise<Goblin[]> {
  const cfgPath = path.join(root, 'Goblinfile.yaml')
  const cfg = YAML.parse(fs.readFileSync(cfgPath, 'utf8'))
  const enabled = ((cfg.plugins || []) as unknown[]).filter(
    (p) => (p as { enabled?: boolean }).enabled
  )
  const plugins: Goblin[] = []
  for (const p of enabled) {
    const pluginCfg = p as { name: string; with?: Record<string, unknown> }
    const modPath = path.join(root, 'packages', 'goblins', pluginCfg.name, 'dist', 'index.js')
    const devPath = path.join(root, 'packages', 'goblins', pluginCfg.name, 'src', 'index.ts')
    let mod: unknown
    try {
      mod = await import(modPath)
    } catch {
      mod = await import(devPath)
    }
    const plugin: Goblin = await (
      mod as { default: (opts?: Record<string, unknown>) => Promise<Goblin> }
    ).default(pluginCfg.with || {})
    plugins.push(plugin)
  }
  return plugins
}
