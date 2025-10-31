# Plugin Versions & Compatibility — ForgeGoblinVault

This document pins the Obsidian community plugins used by the ForgeGoblinVault and provides quick compatibility notes and upgrade guidance.

Location: `Obsidian/🛠️ Tools/PLUGIN_VERSIONS.md`

## Why this file
Pinning plugin versions helps maintain dashboard and template behavior over time and reduces surprises when Obsidian or plugins update.

## Current pinned versions (tested)

| Plugin | Version | Date Tested | Notes |
|--------|---------|-------------|-------|
| Dataview | 0.5.7 | 2025-10-30 | Compatible with dashboard queries + metrics tables. Breaking syntax changes have historically landed in minor releases—always re-run dashboard Dataview blocks after upgrading. |
| Templater | 1.23.2 | 2025-10-30 | JS helper functions (e.g., `generateProjectId`, `calculateKPIStatus`) rely on this API. Verify async helper signatures + system command toggles when bumping. |
| Kanban | 1.6.6 | 2025-10-30 | Board embeds + workflow templates tested with this version. Reopen `📋 Projects` boards after updates to confirm columns render. |
| Calendar | 1.11.1 | 2025-10-30 | Optional plugin for timeline views. No breaking changes expected, but confirm dashboard quick actions still open calendar notes. |

> After updating a plugin, refresh the vault, rerun dashboard queries, and update the table above with the new version + test date.

## How to verify after an upgrade
1. Open vault and run a full refresh (Cmd/Ctrl+R).
2. Open `📊 Dashboards/Intelligent_Development_Dashboard.md` and confirm the main KPIs render.
3. Run a sample Templater template that uses `generateProjectId()` and `calculateKPIStatus()`.
4. Check `🔄 Workflows/` templates that reference Templater helpers.

## Upgrade procedure
1. Create a branch and update the plugin in your local Obsidian client.
2. Run verification steps above and record results in a short PR description.
3. If Dataview queries break, update queries or pin to the previous version and open an action item to migrate queries.
4. Update this file with the new plugin version and the date tested.

## Owner & rotation
- Owner: @fuaadabdullah
- Rotation: Monthly review recommended; update version lines when testing each month.

## Notes
- If we migrate major Dataview versions, consider adding a `dataview-migration.md` doc to capture query deltas.
- Keep core dashboards under source control and run link checks (see recommended CI items in `VAULT_PHASES.md`).
