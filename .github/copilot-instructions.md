# Gemini Agent Instructions for ForgeMonorepo

## 1. Prime Directives

*You are an expert AI assistant and a member of the GoblinOS ecosystem. Your actions must align with these core principles at all times.*

1.  **Understand First, Act Second:** Always analyze the project's structure, existing code, and documentation before making changes. Use `read_file`, `glob`, and `search_file_content` to build context.
2.  **Respect the Ecosystem:** Adhere strictly to the established model (Overmind → Guilds → Goblins). Keep responsibilities within their charter; consult `goblins.yaml` (canonical registry) before delegating cross-guild work. Every guild and goblin has an explicit `reportsTo` relationship to Overmind.
3.  **Prioritize Existing Patterns:** Use existing tools, scripts (`/tools`), and VS Code tasks before writing new ones. Follow the established coding style and architectural patterns.
4.  **Security is Paramount:** Never expose secrets. Use the approved methods for handling credentials as outlined in this document.
5.  **Document As You Go:** Keep documentation (`/Obsidian`, `README.md`) in sync with your changes. Your work is not done until the documentation is updated.

---

## 2. Project Conceptual Model

The ForgeMonorepo is built around a clear hierarchical model:

*   **GoblinOS (The Platform):** The foundational application that enables all Goblins (agents) to operate, communicate, and perform tasks autonomously.
*   **Overmind (The Overseer):** The master orchestrator who delegates work to guild-aligned goblins while enforcing policy gates, LiteBrain routing, and telemetry logging (`goblinos.overmind.router-audit`). All guilds report to Overmind.
    *   **Guilds (Specialized Units):** Groups of goblins with canon charters defined in `goblins.yaml` and the [Guild Charter](../Obsidian/📋 Projects/GoblinOS/Guild_Glossary_and_Charter.md). The registry (`@goblinos/registry`) loads this file and provides typed access for tools/CLIs.
    *   **Forge Guild — Dregg Embercode (Forge Master):** Guards the build graph, performance budgets, and break-glass fixes. LiteBrain: `ollama` → `deepseek-r1` with `nomic-embed-text`.
    *   **Crafters Guild — Vanta Lumin (Glyph Scribe) & Volt Furnace (Socketwright):** Vanta owns UI systems, design tokens, accessibility budgets; Volt owns APIs, schemas, queue idempotency. LiteBrains: `ollama` → `deepseek-r1` and `ollama-coder` → `deepseek-r1`.
    *   **Huntress Guild — Magnolia Nightbloom (Vermin Huntress) & Mags Charietto (Omenfinder):** Magnolia hunts flaky regressions; Mags scouts early signals via log mining. LiteBrains route `ollama-coder` → `openai` and `ollama-coder` → `gemini`.
    *   **Keepers Guild — Sentenial Ledgerwarden (Sealkeeper):** Protects secrets, SBOMs, attestations, and backup drills. LiteBrain: `ollama` + `nomic-embed-text` → `deepseek-r1`.
    *   **Mages Guild — Hex Oracle (Forecasting Fiend), Grim Rune (Glitch Whisperer), Launcey Gauge (Fine Spellchecker):** Hex projects release risk/capacity, Grim handles anomaly detection + auto tickets, Launcey enforces lint/test/schema gates. LiteBrains: `ollama` → `deepseek-r1` and `ollama-coder` → `deepseek-r1`.
*   **Goblins (The Agents):** Individual AI operators mapped above. Respect their KPIs (e.g., CLS < 0.1 for Vanta, p95 build time for Dregg) and PR gates (`keepers/sentenial-check`, `mages/quality-check`, `crafters/ui-a11y-check`, `forge/perf-benchmark`).

The ultimate goal is for these Goblins to autonomously perform the complex jobs of a human development team.

---

## 3. Guild Charter Compliance

**CRITICAL:** All actions must comply with the [Guild Charter](../Obsidian/📋 Projects/GoblinOS/Guild_Glossary_and_Charter.md). Before taking any action:

1. **Identify the Guild Owner:** Determine which guild owns the domain you're working in
2. **Check KPIs:** Ensure your changes align with guild KPIs and responsibilities
3. **Verify LiteBrain Routing:** Use appropriate models per guild routing matrix
4. **Log Telemetry:** All routing decisions must be logged to `goblinos.overmind.router-audit`
5. **Pass Quality Gates:** Ensure changes pass relevant PR gates

### Guild Domain Mapping

- **Code/Build/Infrastructure:** Forge Guild (Dregg Embercode)
- **UI/UX/Design/APIs:** Crafters Guild (Vanta Lumin / Volt Furnace)
- **Testing/Monitoring:** Huntress Guild (Magnolia Nightbloom / Mags Charietto)
- **Security/Secrets/Compliance:** Keepers Guild (Sentenial Ledgerwarden)
- **Quality Gates/Documentation:** Mages Guild (Launcey Gauge)
- **Forecasting/Anomaly Detection:** Mages Guild (Hex Oracle / Grim Rune)

---

## 4. Workspace & Technology Overview

This is a VS Code multi-root workspace containing several key projects.

*   **`ForgeTM/`**: The primary application being developed by the Crafters Guild.
    *   **Backend (`apps/backend/`):** Python 3.11+, FastAPI, Pydantic, `uvicorn`, `ruff`, `mypy`.
    *   **Frontend (`apps/frontend/`):** TypeScript, Next.js 14, React 18, Vite, TanStack Query, tRPC.
*   **`GoblinOS/`**: The platform and agent framework.
    *   **Core (`packages/goblins/`):** TypeScript, Node.js 20+.
    *   **Dashboard (`packages/goblins/overmind/dashboard/`):** React/Vite frontend with Tauri desktop wrapper for the GoblinOS Hub application.
    *   **API (`packages/goblins/overmind/api/`):** FastAPI backend for the Overmind orchestrator.
    *   **Tooling:** `pnpm` workspaces, Biome for linting/formatting, Vitest for testing.
*   **`graph-java/`**: A Java-based project for graph modeling.
*   **`infra/`**: Kubernetes charts, gitops configurations, and infrastructure-as-code.
*   **`Obsidian/`**: The central knowledge base. All documentation, plans, and templates are stored here as `.md` files.
*   **`tools/`**: Shared utility and automation scripts.

---

## 4. Standard Operating Procedures (SOPs)

### SOP-01: Making Any Change

1.  **Understand the Goal:** Clarify the user's request.
2.  **Gather Context:** Use `read_file`, `glob`, and `search_file_content` to study relevant files.
3.  **Formulate a Plan:** Announce your plan to the user before taking action.
4.  **Execute with Tools:** Use the available tools to implement the plan.
5.  **Verify:** Run tests (`pnpm test`, `pytest`), linters (`tools/lint_all.sh`), and other checks to ensure your changes are correct and adhere to project standards.
6.  **Update Documentation:** Modify `README.md` files or documents in `Obsidian/` to reflect your changes.

### SOP-01b: Autonomous Fixes (Guardrails)

The agent is authorized to perform low-risk automated fixes without explicit human approval when the changes fall inside the guardrails below. Always follow SOP-01 first. When performing automated fixes, log actions to the repo and create a draft PR for human review.

1. Scope (auto-fix allowed):
    - Typo fixes, formatting (biome) and lint autofixes, missing trivial type annotations (e.g., adding `-> None`), small test adjustments to reflect intended behavior, and small refactors that touch <= 5 files and <= 200 lines total.
    - Health-checks, debug print gating, and adapter normalization that improve robustness without changing external behavior.

2. Scope (human approval required):
    - Changes that modify authentication, secrets, credential loaders, infrastructure IaC, database schemas, or add/remove third-party dependencies.
    - Changes touching more than 5 files or that alter public APIs/exports, or that require migration steps.

3. Safety checks before commit (automated):
    - Run formatting/lint (`biome check --write` or `tools/lint_all.sh`) and auto-apply safe fixes.
    - Run unit tests for the affected package and, when quick, run `pnpm -w test` or the workspace test subset. If tests are slow, run the package's unit tests plus linter and mypy/type checks for Python packages.
    - If any tests fail, do not commit changes. Instead, create a draft PR with the failing logs and mark it for human attention.

4. Commit / PR behavior (automated):
    - Create a feature branch named `autofix/<short-description>-<yyyyMMddHHmm>` and commit changes with a concise message and a standardized PR description that includes: what was changed, why, tests/lint results, and the artifact list (files changed).
    - Push the branch and open a draft PR targeting `main`. Add reviewers from the owning guild (see `goblins.yaml`) and label the PR `autofix`.

5. Audit & rollback:
    - Record a short audit entry to `goblinos.overmind.router-audit` (or a repo-maintained audit log file) with the branch name, commit hash, files changed, and outcome of tests/lint.
    - If a human reviewer requests changes or the PR shows failing CI, the agent may attempt one targeted fix per reviewer request; any additional changes require explicit human approval.

6. Emergency rollback:
    - If a post-merge regression is detected and verified (failing tests, major runtime errors), the agent may open a rollback PR reverting the change and notify the owning guild. Rollbacks follow the same review rules.

7. Transparency:
    - Every automated change must include a clear PR description and a link to the related ticket or conversation. Avoid hidden or untraceable edits.


### SOP-02: Adding a New Dependency

1.  **Identify Package File:** Locate the correct `package.json` (for Node.js) or `pyproject.toml` (for Python).
2.  **Add Dependency:** Add the new package to the file.
3.  **Install:** Run `pnpm install` or `pip install -e .` in the correct directory.
4.  **Verify:** Check that the lockfile (`pnpm-lock.yaml` or `requirements.txt`) has been updated.
5.  **Document:** If the dependency requires new setup steps, update the relevant `README.md`.

### SOP-03: Modifying an API

1.  **Update Code:** Change the API implementation.
2.  **Update Tests:** Modify existing tests to match the new behavior.
3.  **Update Docs:** Regenerate or update the OpenAPI documentation (for FastAPI).
4.  **Update Consumers:** Find and update any code within the monorepo that uses the API.
5.  **Document:** Update the relevant `README.md` or usage guides in `Obsidian/`.

---

## 5. Tool Usage & Quality Gates

### Preferred Tools & Commands

Use these first; don’t invent ad‑hoc scripts unless necessary.

*   **VS Code Tasks:** `dev:stack` (full stack), `lint:all` (multi‑project lint)
*   **Forge Guild CLI (Dregg Embercode):**
    * `pnpm forge-guild doctor` — environment diagnostics
    * `pnpm forge-guild check` — Biome auto‑fix (write/unsafe) + clean pass + `pip check`
    * `pnpm forge-guild biome-check|fix|format|imports` — code hygiene
    * `pnpm forge-guild deps update|resolve|audit|sync` — Python deps for `ForgeTM/apps/backend`
    * `pnpm forge-guild secrets …` — secret operations
*   **Guild CLIs (registry‑backed toolbelts):**
    * `pnpm -C GoblinOS crafters-guild --help` — UI guardrails, backend config/deploy/maintain
    * `pnpm -C GoblinOS huntress-guild --help` — smoke probes, signal‑scouting
    * `pnpm -C GoblinOS keepers-guild --help` — secrets, security, storage hygiene
    * `pnpm -C GoblinOS mages-guild --help` — lint/quality gates, vault validation
*   **Registry Validation:** `pnpm -C GoblinOS telemetry:validate` — checks `goblins.yaml` coherence (tools/args/fallbacks)
*   **Overmind Dashboard:** `pnpm -C GoblinOS/packages/goblins/overmind/dashboard dev`
    * Env: `VITE_API_URL`, `VITE_GOBLINS_CONFIG=../../../../goblins.yaml`
    * Routes: `/forge`, `/crafters`, `/huntress`, `/keepers`, `/mages`
*   **Bridge/Service Routes:** `POST /forge-guild/doctor|bootstrap|sync-config|check`

### Quality Gates

*   **Pre-Commit:** All changes should pass `pre-commit run --all-files`.
*   **Pull Request:** Before merging, ensure the following pass:
    *   `tools/lint_all.sh`
    *   All tests (`pnpm test`, `pytest`)
    *   `ggshield` secret scan
    *   Guild-specific quality gates (see Guild Charter)

---

## 7. LiteBrain Routing & Model Selection

**MANDATORY:** Follow the LiteBrain routing matrix from the [Guild Charter](../Obsidian/📋 Projects/GoblinOS/Guild_Glossary_and_Charter.md).

### Routing Rules

1. **Local First:** Always prefer `ollama`/`ollama-coder` for speed and cost
2. **Guild-Specific:** Use guild-appropriate primary routers (`deepseek-r1`, `openai`, `gemini`)
3. **Escalation Triggers:** Complexity, external APIs, high-stakes decisions
4. **Audit Required:** Log all routing decisions to `goblinos.overmind.router-audit`
5. **Fallback Chain:** Local → Primary Router → Secondary Router → Human escalation

### Model Usage Guidelines

- **Code Generation/Refactor:** Start with `ollama-coder`, escalate to `deepseek-r1` for complexity
- **Reasoning/Forecasting:** `deepseek-r1` primary, `openai` fallback, `gemini` exploratory
- **UI Copy/Micro-UX:** `openai` primary, `gemini` secondary
- **RAG Operations:** `nomic-embed-text` + cross-encoder rerank with source attribution

---

## 8. Security & Credentials

*   **NEVER hardcode secrets.**
*   **Production:** All secrets must be loaded from environment variables.
*   **Development:** Use `.env` files for local development. These are not committed.
*   **Templates:** Always update the corresponding `.env.example` file when adding a new secret.
*   **Management:** Use `pnpm forge-guild secrets …` (owned by Dregg Embercode; operated in partnership with Keepers). Do not reference "smithy" directly in operational guidance.
*   **Reference:** For detailed guidance, see `Obsidian/🔐 Security & Keys/API_KEYS_MANAGEMENT.md`.

---

*Last Updated: October 29, 2025*
