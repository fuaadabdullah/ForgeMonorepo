# @goblinos/crafters-guild

Crafters Guild CLI orchestrates UI guardrails and backend socket runbooks.

## Usage

```bash
pnpm -C GoblinOS crafters-guild --help
```

### Commands
- `ui:guard` — ensure pnpm is installed before UI workstreams.
- `api:config` — run backend configuration wizard.
- `api:deploy [target]` — deploy backend (`local` by default).
- `api:maintain <task>` — execute backend maintenance routine.
- `tools` — list guild toolbelt assignments and owners.
