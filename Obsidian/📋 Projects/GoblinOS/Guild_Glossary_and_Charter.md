---
title: "Guild Glossary & Charter"
component: "GoblinOS"
status: "Canonical"
owner: "Overmind"
date: "2025-10-29"
priority: "Critical"
---

# 🏰 Guild Glossary & Charter

## Executive Summary

This document serves as the canonical reference for the GoblinOS guild system. It defines the five core guilds, their goblin members, responsibilities, KPIs, escalation paths, and LiteBrain routing configurations. All guild operations must align with this charter.

## 1. Guild System Overview

### Core Principles

- **Specialization**: Each guild owns a distinct domain with clear boundaries
- **Autonomy**: Guilds operate independently within their charters
- **Collaboration**: Cross-guild work requires explicit coordination through Overmind
- **Accountability**: Each guild maintains measurable KPIs and quality gates

### Governance Structure

- **Overmind**: Central orchestrator and final authority
- **Guild Masters**: Lead goblins responsible for guild operations
- **Policy Gates**: Automated checks enforced at PR and deployment levels
- **Telemetry**: All decisions logged to `goblinos.overmind.router-audit`

### Reporting Chain

- Every guild reports directly to **Overmind**, who adjudicates priorities, resolves cross-guild conflicts, and measures outcomes against strategic KPIs.
- **Guild Masters** serve as the first escalation point inside each guild and steward communication back to Overmind.
- Individual goblins report into their guild leadership; expectations, KPIs, and escalation protocols are enforced through guild charter mandates.
- When a mandate spans multiple guilds, Overmind chairs the coordination ceremony and documents joint accountability in the command ledger.

## 2. Guild Directory

### 🛠️ Forge Guild
**Master**: Dregg Embercode (Forge Master)
**Charter**: Drives the core logic graph, governs performance budgets, and owns break-glass fixes for the stack.

#### Responsibilities

- Build graph guardianship and dependency management
- Performance budgets and regression response
- Break-glass ownership for critical fixes
- Infrastructure provisioning and scaling

#### KPIs

- `p95_build_time`: < 5 minutes
- `hot_reload_time`: < 2 seconds
- `failed_build_rate`: < 2%

#### LiteBrain Configuration

- **Local**: `ollama`
- **Routers**: `deepseek-r1`
- **Embeddings**: `nomic-embed-text`

#### Escalation Paths

1. **Performance Issues** → Dregg Embercode
2. **Build Failures** → Dregg Embercode + Crafters Guild
3. **Infrastructure** → Dregg Embercode + Keepers Guild

---

### 🎨 Crafters Guild
**Members**: Vanta Lumin (Glyph Scribe), Volt Furnace (Socketwright)
**Charter**: Owns the full UX surface area and service contracts—the glyphs, sockets, schemas, and queues wiring the forge to everything else.

#### Vanta Lumin (Glyph Scribe)
**Responsibilities**:
- UI systems and theme token management
- Accessibility conformance and WCAG compliance
- CLS (Cumulative Layout Shift) and LCP (Largest Contentful Paint) budgets
- Design system maintenance and component libraries

**KPIs**:
- `accessibility_score`: > 95%
- `cls_budget`: < 0.1
- `lcp_budget`: < 2.5s

**LiteBrain**: `ollama` → `deepseek-r1`

#### Volt Furnace (Socketwright)
**Responsibilities**:
- API and schema health monitoring
- Queue topology and message idempotency
- Error budget enforcement and rate limiting
- Service contract validation and API versioning

**KPIs**:
- `api_uptime`: > 99.9%
- `error_rate`: < 0.1%
- `queue_latency`: < 100ms

**LiteBrain**: `ollama-coder` → `deepseek-r1`

#### Escalation Paths
1. **UI/UX Issues** → Vanta Lumin
2. **API Problems** → Volt Furnace
3. **Cross-cutting** → Vanta Lumin + Volt Furnace + Overmind

---

### 🏹 Huntress Guild
**Members**: Magnolia Nightbloom (Vermin Huntress), Mags Charietto (Omenfinder)
**Charter**: Huntress agents stalk flaky gremlins, surface early warnings, and keep incident breadcrumbs ready for the rest of the guilds.

#### Magnolia Nightbloom (Vermin Huntress)
**Responsibilities**:
- Flaky test detection and elimination
- Regression triage and root cause analysis
- Incident tagging taxonomy and classification
- Test reliability monitoring and maintenance

**KPIs**:
- `test_flakiness_rate`: < 1%
- `regression_detection_time`: < 30 minutes
- `incident_mttf`: > 24 hours

**LiteBrain**: `ollama-coder` → `openai`

#### Mags Charietto (Omenfinder)
**Responsibilities**:
- Early signal scouting across logs and metrics
- Trend surfacing and anomaly detection
- Signal precision metrics and false positive reduction
- Predictive alerting and early warning systems

**KPIs**:
- `signal_precision`: > 85%
- `false_positive_rate`: < 5%
- `early_warning_lead_time`: > 4 hours

**LiteBrain**: `ollama-coder` → `gemini`

#### Escalation Paths
1. **Test Failures** → Magnolia Nightbloom
2. **Monitoring Alerts** → Mags Charietto
3. **System Incidents** → Both + Mages Guild

---

### 🔐 Keepers Guild
**Master**: Sentenial Ledgerwarden (Sealkeeper)
**Charter**: Keepers lock down the vault—secrets, SBOMs, licenses, attestations, and backups all flow through Sentenial Ledgerwarden.

#### Responsibilities
- Secrets rotation and credential management
- Artifact signing and SBOM integrity verification
- Backup drills and disaster recovery testing
- License compliance and dependency auditing
- Security posture monitoring and vulnerability assessment

#### KPIs
- `secret_rotation_compliance`: 100%
- `backup_success_rate`: > 99.9%
- `security_scan_coverage`: > 95%

#### LiteBrain Configuration
- **Local**: `ollama`
- **Routers**: `deepseek-r1`
- **Embeddings**: `nomic-embed-text`

#### Escalation Paths
1. **Security Issues** → Sentenial Ledgerwarden
2. **Compliance Violations** → Sentenial Ledgerwarden + Legal
3. **Data Breaches** → Sentenial Ledgerwarden + All Guilds + Executive

---

### 🔮 Mages Guild
**Members**: Hex Oracle (Forecasting Fiend), Grim Rune (Glitch Whisperer), Launcey Gauge (Fine Spellchecker)
**Charter**: Mages project futures, chase anomalies, and keep the spellbook (tests, lint, schemas) pristine.

#### Hex Oracle (Forecasting Fiend)
**Responsibilities**:
- Release risk scoring and deployment forecasting
- Incident likelihood prediction and capacity modeling
- Resource utilization forecasting and scaling recommendations

**KPIs**:
- `forecast_accuracy`: > 80%
- `capacity_planning_lead_time`: > 2 weeks
- `risk_assessment_coverage`: > 90%

**LiteBrain**: `ollama` → `deepseek-r1`

#### Grim Rune (Glitch Whisperer)
**Responsibilities**:
- Anomaly detection across metrics, logs, and traces
- Automated ticket generation for identified issues
- Alert precision and recall tuning
- Root cause analysis and pattern recognition

**KPIs**:
- `anomaly_detection_rate`: > 95%
- `false_positive_rate`: < 10%
- `auto_ticket_accuracy`: > 75%

**LiteBrain**: `ollama-coder` → `deepseek-r1`

#### Launcey Gauge (Fine Spellchecker)
**Responsibilities**:
- Lint/test/schema gate enforcement
- Diátaxis conformance reviews and documentation standards
- PR gate upkeep and quality automation
- Code quality metrics and standards enforcement

**KPIs**:
- `lint_compliance`: > 98%
- `test_coverage`: > 90% (Python), > 85% (TypeScript)
- `pr_gate_success_rate`: > 95%

**LiteBrain**: `ollama` → `deepseek-r1`

#### Escalation Paths
1. **Quality Gates** → Launcey Gauge
2. **Anomalies** → Grim Rune
3. **Forecasting** → Hex Oracle
4. **System-wide Issues** → All three + Overmind

## 3. LiteBrain Routing Matrix

| Guild | Goblin | Local Model | Primary Router | Secondary Router | Embeddings | Use Case |
|-------|--------|-------------|----------------|------------------|------------|----------|
| Overmind | Overseer | `ollama`, `ollama-coder` | `deepseek-r1` | `openai`, `gemini` | `nomic-embed-text` | Orchestration & routing |
| Forge | Dregg Embercode | `ollama` | `deepseek-r1` | - | `nomic-embed-text` | Code generation & infra |
| Crafters | Vanta Lumin | `ollama` | `deepseek-r1` | - | - | UI/UX design & accessibility |
| Crafters | Volt Furnace | `ollama-coder` | `deepseek-r1` | - | - | API design & backend logic |
| Huntress | Magnolia Nightbloom | `ollama-coder` | `openai` | - | - | Test analysis & debugging |
| Huntress | Mags Charietto | `ollama-coder` | `gemini` | - | - | Log analysis & pattern recognition |
| Keepers | Sentenial Ledgerwarden | `ollama` | `deepseek-r1` | - | `nomic-embed-text` | Security & compliance |
| Mages | Hex Oracle | `ollama` | `deepseek-r1` | - | - | Forecasting & analytics |
| Mages | Grim Rune | `ollama-coder` | `deepseek-r1` | - | - | Anomaly detection & automation |
| Mages | Launcey Gauge | `ollama` | `deepseek-r1` | - | - | Quality gates & standards |

### Routing Rules
1. **Local First**: Always prefer local Ollama models for speed and cost
2. **Escalation Triggers**: Complex reasoning, external API calls, or high-stakes decisions
3. **Audit Required**: All routing decisions logged to telemetry
4. **Fallback Chain**: Local → Primary Router → Secondary Router → Human escalation

## 4. PR Gates & Quality Checks

### Active Gates
- `keepers/sentenial-check`: Security scanning and secret detection
- `mages/quality-check`: Lint, test, and schema validation
- `crafters/ui-a11y-check`: Accessibility and UI standards
- `forge/perf-benchmark`: Performance regression testing

### Gate Responsibilities
- **Keepers Gate**: Sentenial Ledgerwarden owns security compliance
- **Mages Gate**: Launcey Gauge owns code quality standards
- **Crafters Gate**: Vanta Lumin owns UI/UX standards
- **Forge Gate**: Dregg Embercode owns performance standards

## 5. Escalation Protocols

### Level 1: Guild Internal
- Issues contained within guild boundaries
- Resolved by guild master or designated goblin
- Logged for continuous improvement

### Level 2: Cross-Guild Coordination
- Issues requiring multiple guilds
- Overmind facilitates coordination
- Joint resolution with documented agreements

### Level 3: Executive Escalation
- System-wide impact or strategic decisions
- Overmind recommends executive involvement
- Formal incident response procedures activated

### Level 4: Emergency Break-Glass
- Critical system stability threatened
- Dregg Embercode authorized for immediate action
- Post-incident review mandatory

## 6. Telemetry & Observability

### Required Logging
- All LiteBrain routing decisions → `goblinos.overmind.router-audit`
- KPI measurements → Guild-specific dashboards
- Cross-guild interactions → Overmind coordination logs
- Policy gate results → Quality gate telemetry

### Monitoring Dashboards
- **Overmind Dashboard**: Guild health, routing metrics, coordination status
- **Guild Dashboards**: Individual KPIs, performance trends, escalation tracking
- **System Dashboard**: Cross-cutting metrics, incident tracking, compliance status

## 7. Charter Maintenance

### Annual Review Process
1. **Q4 Planning**: Guild masters propose charter updates
2. **Overmind Review**: Alignment with system goals assessed
3. **Guild Consensus**: Cross-guild impact evaluation
4. **Executive Approval**: Final charter ratification

### Change Management
- All charter changes require Overmind approval
- Impact assessments for KPI and routing changes
- Gradual rollout with monitoring and rollback plans
- Documentation updates synchronized across all systems

---

*This charter serves as the foundation for autonomous goblin operations. All guild activities must align with these principles and responsibilities. Last updated: 2025-10-29*</content>
<parameter name="filePath">/Users/fuaadabdullah/ForgeMonorepo/Obsidian/📋 Projects/GoblinOS/Guild_Glossary_and_Charter.md
