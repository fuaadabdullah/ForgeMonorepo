---
title: "Mages Guild – Operating Manual"
component: "GoblinOS"
status: "Operational"
owner: "Hex Oracle, Grim Rune, Launcey Gauge"
date: "2025-01-12"
---

# 🔮 Mages Guild – Operating Manual

## Responsibilities
- Hex: Forecasting, risk scoring, capacity planning.
- Grim: Anomaly detection, auto-ticketing, alert precision/recall.
- Launcey: Lint/test/schema gates, documentation standards.

## Common Commands
```bash
# Quality suite
pnpm -C GoblinOS mages-guild quality:lint

# Vault validation
pnpm -C GoblinOS mages-guild vault:validate
```

## Escalation
- Gate failures (lint/tests/schemas) → Launcey → Overmind.
- Forecast anomalies / systemic issues → Hex/Grim → Overmind (coordinate with owning guilds).

