# Contributing to ForgeMonorepo

Welcome to the GoblinOS guild network. This repository runs on an explicit charter: Overmind (the Overseer) routes work to specialized guilds, each stewarded by a named goblin with hard KPIs and LiteBrain policies. Before you touch code, read this guide end to end, then keep `goblins.yaml` open—it’s the single source of truth for guild ownership, PR gates, and model routing.

---

## 1. Mission Control Quickstart

```bash
git clone <repo-url>
cd ForgeMonorepo
pnpm install                       # installs root + workspace deps
pnpm forge-guild doctor            # workspace health
pnpm forge-guild check             # lint/format/test harness

# Launch Overmind dashboard (guild control surface)
pnpm -C GoblinOS/packages/goblins/overmind/dashboard dev

# Required vars inside GoblinOS/packages/goblins/overmind/dashboard/.env.local
VITE_API_URL=http://127.0.0.1:8000
VITE_GOBLINS_CONFIG=../../../../goblins.yaml
```

**Prereqs**
- Python 3.11+ (Forge backend)
- Node.js 20+ (GoblinOS + dashboards)
- pnpm (workspace package manager)
- VS Code with `forge.code-workspace` (folders mapped to guild directories)

**Secrets**: decrypt via `./decrypt-env.sh <path>` (SOPS) or copy `.env.example` → `.env`. Never commit plaintext credentials.

---

## 2. Guild Governance (Read Before You Branch)

| Guild | Canon Goblin | Charter Focus | LiteBrain Route | KPIs | PR Gate |
|-------|--------------|---------------|-----------------|------|---------|
| **Forge** | Dregg Embercode · Forge Master | Build graph, performance budgets, break-glass fixes | `ollama` → `deepseek-r1` with `nomic-embed-text` | p95 build time, hot reload latency, failed build rate | `forge/perf-benchmark` |
| **Crafters** | Vanta Lumin · Glyph Scribe (UI), Volt Furnace · Socketwright (APIs) | UI systems, theme tokens, CLS/LCP, APIs, schemas, queues | Vanta: `ollama` → `deepseek-r1`; Volt: `ollama-coder` → `deepseek-r1` | CLS < 0.1, LCP < 2.5s, error budget adherence, schema drift = 0 | `crafters/ui-a11y-check` |
| **Huntress** | Magnolia Nightbloom · Vermin Huntress, Mags Charietto · Omenfinder | Flaky triage, regression hunts, early signal scouting | Magnolia: `ollama-coder` → `openai`; Mags: `ollama-coder` → `gemini` | Flaky rate ↓ 50%, MTTR for test failures, valid early signals, false-positive rate | `huntress/regression-check` |
| **Keepers** | Sentenial Ledgerwarden · Sealkeeper | Secrets, SBOM, signatures, backups, attestations | `ollama` + `nomic-embed-text` → `deepseek-r1` | Secrets rotated, SBOM drift = 0, unsigned artifacts = 0 | `keepers/sentenial-check` |
| **Mages** | Hex Oracle · Forecasting Fiend, Grim Rune · Glitch Whisperer, Launcey Gauge · Fine Spellchecker | Release risk, anomaly detection, lint/test/schema gates, Diátaxis stewardship | Hex/Launcey: `ollama` → `deepseek-r1`; Grim: `ollama-coder` → `deepseek-r1` | Forecast MAE/MAPE, release risk AUC, anomalies caught pre-prod, PR gate pass rate | `mages/quality-check` |

Authoritative references:
- `goblins.yaml` — canonical roster, LiteBrains, KPIs, PR gates.
- `Obsidian/📋 Projects/GoblinOS/Guild_Glossary_and_Charter.md` — extended charter, escalation matrix.

**Rule zero:** do not cross guild boundaries without the owning goblin’s approval. Split multi-guild work into scoped PRs.

**Command chain:** Specialists report to their Guild Master; Guild Masters report to **Overmind**. Escalate blocking issues through that ladder and log decisions in router audit telemetry.

---

## 3. Routing & Telemetry Policy

- Codegen / refactors: default to `ollama-coder`, escalate to `deepseek-r1` when complexity crosses guild thresholds.
- Reasoning / forecasting: `deepseek-r1` primary, `openai` fallback, exploratory passes may use `gemini`.
- UI copy / micro-UX: `openai`, then `gemini`.
- RAG over ForgeVault: `nomic-embed-text` embeddings + cross-encoder rerank with strict source attribution.

**Compliance:** every router decision must log to `goblinos.overmind.router-audit`. If it isn’t logged, it didn’t happen. Never disable telemetry or policy gates.

---

## 4. Standard Workflow

1. **Study the charter** – open `goblins.yaml`, confirm guild owner(s) and KPIs.
2. **Create a branch** – name with guild context (`feature/crafters-trading-a11y`).
3. **Use existing tools** – prefer Forge Guild tasks (`pnpm forge-guild ...`), `tools/*` scripts, and VS Code tasks over ad-hoc commands.
4. **Develop + verify continuously**
   ```bash
   pnpm forge-guild check
   tools/lint_all.sh
   pnpm test
   pytest
   ```
5. **Document as you go** – update README/Obsidian entries; follow Diátaxis (tutorial/reference/how-to/conceptual).
6. **Commit with guild metadata**
   ```bash
   git commit -m "feat(crafters): tighten trading a11y budgets

   - enforces WCAG contrast tokens
   - wires CLS/LCP telemetry into router audit
   - updates goblins.yaml charter for Volt's queue SLO"
   ```
7. **Open PRs with discipline**
   - Tag the owning guild(s).
   - Link to telemetry dashboards when relevant.
   - State KPI impact and LiteBrain routing choices.

---

## 5. Quality Gates & Known Debt

Required before review:
- `pre-commit run --all-files`
- `tools/lint_all.sh`
- `pnpm test`
- `pytest`
- `ggshield secret scan`
- Applicable guild gate(s): `forge/perf-benchmark`, `crafters/ui-a11y-check`, `huntress/regression-check`, `keepers/sentenial-check`, `mages/quality-check`

Current gaps you **must** acknowledge in PRs:
- ESLint for Overmind dashboard fails (`pnpm -C GoblinOS/packages/goblins/overmind/dashboard lint`) because `GoblinOS/.eslintrc.cjs` extends missing `"prettier"`. Restore the config or call it out.
- TypeScript type-check fails (`pnpm -C ... type-check`) with errors in `src/hooks/useChat.ts`, `src/pages/ChatPage.tsx`, `src/pages/trading/RAGExplorerPage.tsx`. If your changes touch these files, resolve the debt.

---

## 6. Testing Playbook

| Guild | Core Tests | Example Commands |
|-------|------------|------------------|
| Forge | Build benchmarks, dependency audits, infra smoke | `pnpm forge-guild perf --benchmark`, `pnpm -C ForgeTM/apps/frontend build`, `tools/deploy_backend.sh --dry-run` |
| Crafters | Accessibility (axe/pa11y), visual regression, API schema validation | `pnpm -C GoblinOS/packages/goblins/overmind/dashboard test`, `pytest -k api`, Storybook/Chromatic where available |
| Huntress | Flake radar, regression suites, telemetry alert sims | `pnpm forge-guild test --guild huntress`, `pnpm -C GoblinOS/packages/goblins/overmind/dashboard test --runInBand` |
| Keepers | SBOM diffs, secret rotation rehearsal, signature validation | `tools/secrets_manage.sh --audit`, `pnpm forge-guild release --guild keepers --dry-run` |
| Mages | Lint/test gate enforcement, anomaly backtests, documentation checks | `tools/lint_all.sh`, `pnpm vitest --run`, doc link checks |

Submit concise test evidence in your PR (commands + summary). No raw log dumps.

---

## 7. Documentation & Diátaxis

- Tutorials → `Obsidian/` under guild-specific folders with tutorial tags.
- Reference → README files, API specs, `docs/` directories.
- How-to → `Obsidian/` how-to notes linking back to the charter.
- Conceptual → `Obsidian/` conceptual notes, guild strategy docs.

Order of operations for doc updates:
1. Update `goblins.yaml`.
2. Sync Obsidian entries + README/manuals.
3. Annotate changelog/charter diffs if KPIs or routes shift.

---

## 8. Security, Secrets & Compliance

- Keepers Guild owns secret management—use the `pnpm forge-guild secrets` suite.
- Encrypt sensitive files with SOPS; rotate keys per cadence in `goblins.yaml`.
- Security checklist (tick in PR description):
  - [ ] Secrets encrypted with SOPS
  - [ ] No hardcoded credentials/API keys
  - [ ] `ggshield` clean
  - [ ] Dependencies audited
  - [ ] Router audit log emits entries for all automated actions

---

## 9. Release Cadence

1. **Forge** certifies build graph & performance (`forge/perf-benchmark`).
2. **Crafters** sign off CLS/LCP + API drift (`crafters/ui-a11y-check`).
3. **Huntress** verifies regression telemetry (`huntress/regression-check`).
4. **Keepers** seals secrets, SBOM, signatures (`keepers/sentenial-check`).
5. **Mages** runs risk forecasts + gate conformance (`mages/quality-check`).

```bash
pnpm forge-guild release --validate                # full suite
pnpm forge-guild release --guild keepers           # guild-scoped validation
pnpm forge-guild deploy --environment staging      # stage rollout
```

Always publish rollback + telemetry plans alongside deployment notes.

---

## 10. Future Guild Enablement

- Template packs live in `Obsidian/ForgeGoblinVault/` and `goblins.yaml`.
- New goblins require: name, title, LiteBrain routing, KPIs, PR gate, telemetry topic, doc skeleton.
- Schedule quarterly charter reviews to confirm responsibilities, budgets, and routing policies remain accurate.

---

### Final Words

Ship with guild discipline. If a change isn’t logged, tested, and documented under the right goblin, it never happened. Ping Overmind in the dashboard when you need routing clarity or escalation—just make sure the router audit glows when you do. Welcome to the black-ops compliance squad. Low-key proud already.***
