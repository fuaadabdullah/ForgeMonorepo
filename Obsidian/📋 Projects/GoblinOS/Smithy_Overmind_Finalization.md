---
title: "Smithy + Overmind World-Class Finalization Plan"
component: "GoblinOS"
status: "Planning"
owner: "GoblinOS Core / fuaadabdullah"
date: "2025-10-30"
priority: "High"
---

# 🛠️ Program Goal
Deliver a production-grade Forge Smithy automation platform and Overmind AI orchestrator that can be handed to Forge Guild teams with zero manual babysitting. Success = automated environments in <15 min, 99.5% reliable agent orchestration, <3% ticket regressions, and full compliance evidence for audits.

## 🚩 Guiding Objectives (OKRs)
- **O1 — Automation Everywhere**: 95% of smithy workflows triggered automatically (events, schedules, or remediations) with auditable runs.
- **O2 — Agent Reliability**: Overmind maintains P95 latency <1.8s, failure rate <0.5%, and deterministic routing logs for every decision.
- **O3 — Trust & Compliance**: Security + compliance posture continuously evaluated with automated remediation playbooks and published artifacts (SBOM, audit logs, KPIs).
- **O4 — DX & Adoption**: <2 hour onboarding, self-serve docs, sandboxes, and CLI/API parity so forge engineers can adopt without hand-holding.

---

# 🧵 Workstreams

## WS1 — Smithy Automation & Compliance
| Stream | Scope | Key Deliverables | Acceptance |
| --- | --- | --- | --- |
| WS1A: Event Engine & Scheduler | Finish async event bus, trigger adapters (git, filesystem, cron, webhook) + DAG workflow runner | `smithy.automation` package, trigger registry, persisted workflow state in SQLite/RQ | >90% workflows resumable, integration tests covering git + cron triggers |
| WS1B: Advanced Scheduling & Resource Orchestration | Cron+calendar parser, resource-aware scheduling, retry policies | Scheduler service, resource profiles, policy docs | Schedules survive restarts, resource oversubscription alerts |
| WS1C: Config & Secret Platform | Hierarchical config loader, Vault/AWS Secrets adapters, schema validation, hot reload | `smithy.config` module, JSON schema library, integration tests | All commands pull secrets via adapters, config reload without restart |
| WS1D: AI Agent Framework & Plugin Ecosystem | Specialized agents (security, quality, infra, performance), plugin SDK + registry | `smithy.agents` pkg, plugin manifest spec, sample plugins | ≥4 agents shipping, plugin integration tests, docs for external plugin authors |
| WS1E: Security+Compliance Automation | SAST/DAST integration, dependency + container scans, automated remediation orchestrations | Security scanner service, evidence vault, compliance mapping (SOC2/GDPR/HIPAA) | Daily scans auto-run, evidence snapshots stored, remediation playbooks reviewed |
| WS1F: Observability & Docs | OpenTelemetry spans, metrics dashboards, runbooks, API docs | Grafana dashboards, runbooks in Obsidian, FastAPI schema | MTTR <30 min, docs clear for on-call |

## WS2 — Overmind Productization
| Stream | Scope | Key Deliverables | Acceptance |
| --- | --- | --- | --- |
| WS2A: Router Hardening & Predictive Scoring | Feature extraction, ML scoring service, cascading fallback policies | `router/predictive.ts`, model registry, eval harness | Routing accuracy >92% vs golden set, auto-failover tested |
| WS2B: Crew Engine & Execution Modes | Deterministic crew planner, sequential/parallel/hierarchical flows, crew templates | Task planner DSL, concurrency controls, crew library | 100% of scripted demos run via crews, concurrency bugs <1% |
| WS2C: Memory & Knowledge Mesh | Finish hybrid memory (short/working/long), entity tracking, RAG integration, privacy controls | SQLite+Chroma backends, retention policies, memory inspector tooling | Memory recall >80% on benchmark, GDPR delete flow verified |
| WS2D: Observability & Guardrails | Structured logging, OpenTelemetry traces, cost/latency metrics, governance guardrails (PII, jailbreak) | `observability/` module, dashboards, red-team test suite | Guardrails catch >95% policy violations in tests |
| WS2E: Runtime & Delivery | Temporal workers, Docker/K8s manifests, bridge APIs (FastAPI/Websocket), e2e smoke harness (Playwright + Pact) | `infra/` updates, GitOps Argo apps, nightly e2e job | Blue/green deploys validated, GitOps sync <15 min |

## WS3 — Shared Enablement & Governance
- Unified **Secrets & API key** lifecycle (tie into `tools/secrets_manage.sh` + Vault).
- Release orchestration: smithy via uv/pypi, Overmind via npm provenance + SBOM → automated Changeset/semantic release.
- Documentation + enablement: refresh `Obsidian/README.md`, create onboarding runbook, add KPI tracking entries in 📈 Metrics.
- Testing governance: codify coverage gates (Python ≥90%, TS ≥85%), add mutation testing (cosmic-ray, Stryker), nightly fuzzers.
- Risk & incident management: add runbooks, pager rotation, and DR playbooks; link to infra GitOps for Overmind dev/prod environments.

---

# 📅 Phased Timeline
| Phase | Window | Focus | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| **P0 — Stabilize (Week 0-1)** | Audit current pipelines, ensure tests green, capture KPIs, enable telemetry skeleton | Baseline KPIs logged, smithy `doctor/check` green, Overmind `pnpm test` + `pnpm build` green, observability stubs emitting traces | ✅ Completed 2025-10-30 (see baseline metrics) |
| **P1 — Automation Core (Week 1-4)** | Deliver WS1A/1B + WS2A/2B MVP, integrate with CLI + FastAPI, stand up GitOps dev env | Event engine + scheduler demoed, Overmind router deterministic suite ≥50 test cases, dev env auto-syncs | ⏳ In progress |
| **P2 — Intelligence & Compliance (Week 5-8)** | Ship WS1D/1E + WS2C guardrails, add ML scoring + memory, automate compliance evidence | Agents live with playbooks, memory benchmarks recorded, compliance pipeline stores artifacts | 🗓️ Planned |
| **P3 — Production Hardening (Week 9-12)** | WS1F/WS2D/WS2E + WS3 tasks; focus on SLOs, chaos tests, release automation | 99.5% uptime simulated, blue/green deploy, release checklist automated, docs + runbooks signed off | 🗓️ Planned |
| **P4 — Launch & Scale (Week 12+)** | Rollout to forge guilds, add advanced features (distributed execution, plugin marketplace, RAG insights) | Adoption >3 teams, feedback loop instrumented, backlog groomed for V2 | 🗓️ Planned |

---

# ✅ Verification & Test Strategy
- **Unit & Contract Tests**: expand smithy pytest suites (event engine, scheduler, agents). Strengthen Overmind vitest + pact contracts for bridge APIs.
- **Integration Pipelines**:
  1. `smithy doctor` on clean env (uv) + Biome lint.
  2. Overmind `pnpm lint && pnpm test && pnpm build` + Playwright smoke.
  3. Temporal/Argo deploy dry-run via `infra/gitops` manifests.
- **Performance & Chaos**: load-test Overmind routing (1k RPM), run chaos monkey on smithy workers, track latency + MTTR in Grafana.
- **Security & Compliance**: integrate SAST/DAST (CodeQL, ZAP), dependency scans (pip/audit, pnpm audit), secret scanning via Smithy + repo tooling.
- **Acceptance Reviews**: weekly demo checkpoints anchored to phases; sign-off requires KPI evidence snapshot stored in Obsidian 📈 Metrics + compliance vault.

---

# 📊 KPIs & Telemetry
| KPI | Target | Data Source |
| --- | --- | --- |
| Smithy workflow success rate | ≥98% rolling 7d | Smithy telemetry → Grafana |
| Mean bootstrap duration | ≤15 min | Smithy CLI logs |
| Overmind routing accuracy | ≥92% vs eval set | Router eval harness |
| Overmind cost per 1M tokens | ≤ $0.60 | Billing aggregator |
| Incident MTTR | <30 min | PagerDuty notes |
| Test coverage | Py ≥90%, TS ≥85% | Coverage reports (CI) |

---

# 🧾 Initial Backlog (RICE scored)
| ID | Item | RICE | Owner | Notes |
| --- | --- | --- | --- | --- |
| S-01 | Implement AsyncEventBus + TriggerManager skeleton | 560 | Smithy | Use `asyncio.Queue`, persist state via SQLite |
| S-02 | Scheduler with cron + calendar + resource profiles | 480 | Smithy | Evaluate `croniter`, integrate holiday calendars |
| S-03 | Config/secret adapters (Vault, AWS Secrets Manager) | 420 | Smithy | Follow `secrets_manage.sh` patterns |
| S-04 | Security scanner orchestrator + evidence vault | 390 | Smithy | Integrate CodeQL/ZAP/falco outputs |
| O-01 | Router evaluation harness + golden dataset | 640 | Overmind | Use fixtures in `e2e/` + synthetic prompts |
| O-02 | Predictive scorer (lightweight gradient boosting / heuristic) | 520 | Overmind | Start with weights + capture telemetry |
| O-03 | Crew planner DSL & parallel executor | 480 | Overmind | Build on `src/crew` w/ concurrency controls |
| O-04 | Memory retention policies + privacy tooling | 360 | Overmind | Add GDPR delete + retention configs |
| X-01 | Observability pipeline (OTel exporters, Grafana dashboards) | 500 | Shared | Reuse infra/observability stack |
| X-02 | Runbooks + onboarding guide refresh | 300 | Shared | Update Obsidian README + tools |

---

# ⚠️ Risks & Mitigations
- **Secret Leakage**: Expand use of `tools/secrets_manage.sh`, enforce Smithy secret adapters before enabling new workflows.
- **Provider Instability**: Overmind must keep cascading fallback fully tested; add synthetic monitors hitting OpenAI, Gemini, DeepSeek, Ollama.
- **Schedule Drift**: Weekly checkpoints w/ burndown in 📅 Planning; block next phase unless KPIs hit.
- **Performance Regression**: Add latency + cost regression suite before merging router changes.
- **Plugin Ecosystem Sprawl**: Enforce manifest schema + sandboxing (permissive allowlist) before GA.

---

# 🚀 Immediate Next Actions
1. **Baseline Health Run**: `uv run python -m smithy doctor && check`; `pnpm --filter @goblinos/overmind lint test build` → record results in 📈 Metrics.
2. **Stand up Event Engine Skeleton**: create `smithy/automation/` package scaffolding + tests (Phase P0 deliverable).
3. **Router Eval Harness Kickoff**: generate 50-sample golden dataset + vitest snapshot to quantify current accuracy.
4. **Telemetry Wiring**: add minimal OpenTelemetry middleware (smithy FastAPI + Overmind router) to start emitting spans before P1.
5. **Schedule Program Sync**: 2x weekly 30-min standup (Smithy + Overmind leads) + shared Kanban board.

All supporting docs + runbooks must live under `Obsidian/` (Projects, Workflows, Metrics). Update this plan as milestones close.
