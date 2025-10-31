---
title: "Huntress Guild – Operating Manual"
component: "GoblinOS"
status: "Operational"
owner: "Magnolia Nightbloom & Mags Charietto"
date: "2025-01-12"
---

# 🏹 Huntress Guild – Operating Manual

## Responsibilities
- Magnolia: Flaky detection/elimination, regression triage, incident taxonomy.
- Mags: Early signal scouting, log mining, trend surfacing.

## Common Commands
```bash
# Platform smoke probe
pnpm -C GoblinOS huntress-guild smoke

# (Phase 2) Signal scouting flows will be added as registry expands
```

## Escalation
- Test failures/regressions → Magnolia → Overmind.
- Monitoring anomalies → Mags → Overmind (loop Mages if systemic).

