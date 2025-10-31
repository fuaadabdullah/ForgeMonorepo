---
title: "Guild Command Chain"
component: "GoblinOS"
status: "Authoritative"
owner: "Overmind"
date: "2025-01-12"
priority: "Critical"
---

# 🛡️ Guild Command Chain & Accountability Playbook

## 1. Purpose
Establish a world-class command structure so every goblin understands who they report to, why their work matters, and how Overmind coordinates outcomes across the guild constellation.

## 2. Chain of Command

1. **Overmind** (Overseer) — Holds strategic authority, approves guild charters, and arbitrates cross-guild priorities.
2. **Guild Masters** — Operate their guild autonomously, translate Overmind directives into actionable mandates, and escalate blockers.
3. **Guild Specialists (Goblins)** — Execute playbooks, own KPIs, and surface insights upward through their Guild Master.

Escalation ladder: Specialist → Guild Master → Overmind. Emergency break-glass can bypass steps, but Overmind must be briefed post-incident.

## 3. Guild-by-Guild Accountability

| Guild | Master | Core Mandate | Reports To | Primary KPIs |
| --- | --- | --- | --- | --- |
| Forge | Dregg Embercode | Build graph guardianship, performance budgets, break-glass resilience | Overmind | p95_build_time, hot_reload_time, failed_build_rate |
| Crafters | Vanta Lumin / Volt Furnace | UI systems, service contracts, accessibility & schema rigor | Overmind | accessibility_score, api_uptime, error_rate |
| Huntress | Magnolia Nightbloom / Mags Charietto | Flaky extermination, signal scouting, incident breadcrumbs | Overmind | test_flakiness_rate, signal_precision, incident_mttf |
| Keepers | Sentenial Ledgerwarden | Vault integrity, secrets rotation, compliance enforcement | Overmind | secret_rotation_compliance, backup_success_rate, security_scan_coverage |
| Mages | Hex Oracle / Grim Rune / Launcey Gauge | Forecasting, anomaly detection, quality gates | Overmind | forecast_accuracy, anomaly_detection_rate, lint_compliance |

## 4. Goblin Responsibility Disciplines

Each goblin owns three layers of responsibility:

- **Guild Mandate Alignment** — Deliver work that advances the guild charter and KPIs.
- **Operational Excellence** — Run assigned tools/playbooks, maintain telemetry, and document outcomes.
- **Reporting Rhythm** — Provide status to their Guild Master; surface risks or learnings for Overmind briefs.

Refer to `goblins.yaml` for canonical assignments, LiteBrain routing, tool ownership, and escalation triggers.

## 5. Reporting Cadence

- **Daily**: Specialists log progress + blockers to guild stand-up feed; urgent issues escalate immediately.
- **Weekly**: Guild Masters deliver a “State of the Guild” pulse to Overmind (KPIs, successes, risks, asks).
- **Monthly**: Command Review chaired by Overmind—cross-guild OKRs, roadmap alignment, policy updates.

## 6. Escalation Protocol

1. Attempt resolution within the guild (specialist ↔ guild master).
2. If cross-guild impact emerges or KPI breach persists >24h, escalate to Overmind.
3. Overmind convenes the necessary guild masters and records the decision in the command ledger.

## 7. Accountability Rituals

- **Telemetry Compliance** — Every litebrain routing decision must log to `goblinos.overmind.router-audit` (enforced via Overmind dashboard instrumentation).
- **Tool Stewardship** — Toolbelts defined in `goblins.yaml` are non-optional; owners keep runbooks current and report drift.
- **Retrospectives** — Guild masters host post-incident reviews within 48 hours, sharing learnings with Overmind.

## 8. Continuous Improvement

- Overmind audits guild mandates quarterly; updates require guild consensus + Overmind approval.
- Guild masters mentor successors to maintain depth; succession plans logged in the Guild Command ledger.
- Specialists propose improvements via guild RFCs; Overmind provides final arbitration.

> 🎯 **Reminder**: Autonomy thrives when accountability is explicit. Uphold the chain, log every decision, and escalate with clarity.
