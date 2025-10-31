# Goblin Guild Expansion Plan

## Executive Summary
The GoblinOS ecosystem currently runs with five chartered guilds but only one production-ready automation package (Forge Master). This plan delivers a world-class expansion that equips every guild and goblin with:
- Canonical registry-driven configuration for responsibilities, LiteBrain routing, KPIs, and tool ownership.
- Dedicated automation entry points that execute each guild's runbooks and policy gates.
- Integrated telemetry and documentation so Overmind and human operators can coordinate seamlessly.

The expansion lands in three horizons—laying foundations now, unlocking cross-guild automations next, and optimizing for autonomy afterwards.

## Goals & Success Metrics
- **Configuration single-source**: Guild definitions, LiteBrain wiring, and tool allocations managed from one registry with schema validation.
- **Automation coverage**: CLI packages for Forge, Crafters, Huntress, Keepers, and Mages with task runners mapped to chartered responsibilities.
- **Telemetry discipline**: Every guild CLI publishes structured logs and supports future router audit hooks.
- **Operator clarity**: Updated documentation and Overmind touch points describe how to engage each guild.

KPIs for success:
1. `guild_registry_consistency`: 100% of guild metadata generated from registry (tracked via unit test)
2. `guild_cli_completion_rate`: ≥ 4 critical runbooks per guild automated
3. `tool_assignment_coverage`: 100% of tools declared in registry and surfaced in documentation
4. `litebrain_resolution_accuracy`: No unresolved guild member IDs at runtime

## Current State Snapshot
| Guild | Goblins | Automation | Tooling | Brain Wiring |
| --- | --- | --- | --- | --- |
| Forge | Dregg Embercode | ✅ `@goblinos/forge-master` | Partial (CLI handles deps & biome) | Hard-coded in `@goblinos/brains` |
| Crafters | Vanta Lumin, Volt Furnace | ❌ None | Scripts in `tools/` (config/deploy/maintain) | Hard-coded | 
| Huntress | Magnolia Nightbloom, Mags Charietto | ❌ None | `tools/smoke.sh` | Hard-coded |
| Keepers | Sentenial Ledgerwarden | ❌ None | Security & storage scripts | Hard-coded |
| Mages | Hex Oracle, Grim Rune, Launcey Gauge | ❌ None | `tools/lint_all.sh`, `tools/validate_forge_vault.sh` | Hard-coded |

Gaps:
- No shared registry; YAML, code, and docs drift independently.
- Guild automation relies on manual script invocation.
- Tool ownership matrix is non-actionable markdown.
- LiteBrain wiring duplicates configuration and lacks validation.

## Phase Roadmap

### Phase 1 — Foundation (Now)
- Introduce `@goblinos/guild-registry` shared module with schema validation loading `goblins.yaml` + tool matrix.
- Expand `goblins.yaml` to include canonical tool responsibilities and automation intents per guild & goblin.
- Update `@goblinos/brains` to construct LiteBrains from the registry (single source of truth).
- Author CLI packages for Crafters, Huntress, Keepers, and Mages with structured logging, task runners, and help UX consistent with Forge Master.

### Phase 2 — Orchestration (Next)
- Integrate guild CLIs with Overmind bridge routes for remote invocation.
- Add telemetry hooks to publish router-audit events per guild action.
- Wire KPIs into dashboard by reading registry metadata.
- Support per-goblin configuration overrides (environment variables, auth scopes).

### Phase 3 — Autonomy Optimization (Later)
- Enable adaptive tool selection (guild CLIs query registry for capabilities and auto-prompt for extra context).
- Implement collaborative playbooks spanning multiple guilds (e.g., release readiness gates).
- Add simulation/testing harness to validate guild actions in sandbox before production run.
- Introduce self-healing runbooks triggered by registry-defined conditions.

## Implementation Blueprint
1. **Guild Registry Package**
   - Create `packages/goblins/registry` with Zod schemas for guild, goblin, LiteBrain, KPI, and tool definitions.
   - Provide typed helpers: `getGuild(id)`, `listGoblins()`, `resolveLiteBrain(id)`.
   - Load configuration from `goblins.yaml` plus a new `tools/guild-tools.yaml` (if needed) and expose JSON for Overmind.

2. **Configuration Harmonization**
   - Extend `goblins.yaml` with `tools` arrays at guild and goblin levels, including command references and owners.
   - Add registry-driven validation test ensuring each referenced tool exists in `tools/` and documentation.

3. **Brain Wiring Upgrade**
   - Refactor `@goblinos/brains` to consume registry data, eliminating switch statements; include error messages suggesting remediation.
   - Provide helper `createGuildBrain(guildName)` for multi-goblin contexts.

4. **Guild CLIs**
   - Scaffold packages:
     - `@goblinos/crafters-guild` → commands: `ui:guard`, `api:config`, `api:deploy`, `api:maintain`, `biome:*` (delegates to Forge CLI when needed).
     - `@goblinos/huntress-guild` → commands: `smoke`, `flaky:scan`, `signals:report` (stubs to extend).
     - `@goblinos/keepers-guild` → commands: `secrets:audit`, `security:scan`, `storage:cleanup`.
     - `@goblinos/mages-guild` → commands: `quality:lint`, `quality:full`, `vault:validate`.
   - Each CLI uses shared logger, surfaces tool suggestions, and logs metrics placeholders.
   - Provide `pnpm` workspace scripts for smooth invocation.

5. **Documentation & Enablement**
   - Update `tools/AGENT_TOOLS.md` to reference new CLIs and registry.
   - Add quickstart guides in each package README.
   - Document registry usage for Overmind and other automations.

## Tool Allocation Matrix (Registry Backed)
| Guild | Primary Tools | Secondary Tools |
| --- | --- | --- |
| Forge | `pnpm forge-guild`, `tools/scripts/kill-port.sh` | `forge-smithy` workflows |
| Crafters | `tools/scripts/ensure-pnpm.sh`, `tools/config_backend.sh`, `tools/deploy_backend.sh`, `tools/maintain_backend.sh` | Biome formatters |
| Huntress | `tools/smoke.sh`, placeholder for `tools/flaky_scan.sh` | Incident triage templates |
| Keepers | `tools/api_keys_check.sh`, `tools/security_check.sh`, `tools/secrets_manage.sh`, `tools/disk_consolidation.sh`, `tools/storage_cleanup.sh`, `tools/system_clean.sh`, `tools/space_saver.sh` | `smithy` compliance tasks |
| Mages | `tools/lint_all.sh`, `tools/validate_forge_vault.sh` | Future: mutation testing, coverage reporters |

## Telemetry & Quality Gates
- Standardize logging context: `{ guild, goblin, command, toolsInvoked, durationMs, status }`.
- Add TODO hooks for router audit integration and KPI recording per run.
- Ensure CLI exit codes propagate for CI gating.

## Deliverables for This Iteration
- Registry package, updated YAML, and LiteBrain refactor.
- Four new guild CLI packages with baseline runbooks wired to existing tools.
- Documentation refresh and quickstart instructions.
- Smoke tests verifying CLIs surface help output and resolve tool paths.

## Future Enhancements
- Extend registry with environment metadata (dev/staging/prod) and secret requirements per tool.
- Add interactive prompts for contextual parameters (e.g., pick backend environment to deploy).
- Introduce policy-as-code descriptors for guild gates consumed by CI workflows.
- Emit OpenTelemetry spans for guild actions, enabling distributed tracing across automations.

---
Prepared by: Codex Guild Automation Initiative
