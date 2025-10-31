---
title: "Forge Guild – Operating Manual"
component: "GoblinOS"
status: "Operational"
owner: "Dregg Embercode"
date: "2025-01-12"
---

# 🛠️ Forge Guild – Operating Manual

## Responsibilities
- Build graph guardianship, performance budgets, and break‑glass ownership.
- Infra guardrails and deterministic env setup.

## Common Commands
```bash
# Hygiene suite (Biome auto‑fix + clean pass + pip check)
pnpm forge-guild check

# Biome lint/format/imports
pnpm forge-guild biome-check
pnpm forge-guild biome-fix
pnpm forge-guild biome-format
pnpm forge-guild biome-imports

# Python dependencies for ForgeTM backend
pnpm forge-guild deps update|resolve|audit|sync

# Secrets operations (coordinate with Keepers)
pnpm forge-guild secrets list
```

## Escalation
- Performance regression or build failures → Dregg Embercode → Overmind.
- Security or compliance impacts → loop in Keepers (Sentenial) immediately.

