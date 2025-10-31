---
title: "Crafters Guild – Operating Manual"
component: "GoblinOS"
status: "Operational"
owner: "Vanta Lumin & Volt Furnace"
date: "2025-01-12"
---

# 🎨 Crafters Guild – Operating Manual

## Responsibilities
- Vanta (UI): Design tokens, components, accessibility (WCAG), CLS/LCP budgets.
- Volt (Backend): APIs/schemas, queues, idempotency, error budgets.

## Common Commands
```bash
# UI guardrails
pnpm -C GoblinOS crafters-guild ui:guard

# Backend config and deploy
pnpm -C GoblinOS crafters-guild api:config
pnpm -C GoblinOS crafters-guild api:deploy local   # or docker

# Backend maintenance
pnpm -C GoblinOS crafters-guild api:maintain db_backup
pnpm -C GoblinOS crafters-guild api:maintain db_migrate
```

## Escalation
- UI/UX issues → Vanta → Overmind if cross‑guild.
- API/queue issues → Volt → Overmind if error budget risk.

