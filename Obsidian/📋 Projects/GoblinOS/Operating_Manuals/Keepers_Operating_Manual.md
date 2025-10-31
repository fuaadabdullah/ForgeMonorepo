---
title: "Keepers Guild – Operating Manual"
component: "GoblinOS"
status: "Operational"
owner: "Sentenial Ledgerwarden"
date: "2025-01-12"
---

# 🔐 Keepers Guild – Operating Manual

## Responsibilities
- Secrets rotation, SBOM integrity, signatures, backups, compliance.

## Common Commands
```bash
# Audits
pnpm -C GoblinOS keepers-guild secrets:audit
pnpm -C GoblinOS keepers-guild security:scan

# Hygiene
pnpm -C GoblinOS keepers-guild storage:cleanup
pnpm -C GoblinOS keepers-guild storage:consolidate
pnpm -C GoblinOS keepers-guild storage:space-saver
pnpm -C GoblinOS keepers-guild system:clean
```

## Escalation
- Credential leaks / security incidents → Sentenial → Overmind immediately.
- Compliance violations → Sentenial → Legal/Overmind.

