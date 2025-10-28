# Prerelease Channels (Canary/Next)

## Quick Start

### Enter prerelease mode (canary/next channel)

```bash
# Start next channel
pnpm -C GoblinOS changeset pre enter next

# Create changesets as usual
pnpm -C GoblinOS changeset

# Publish to next tag
pnpm -C GoblinOS release:next
```

### Exit prerelease mode (back to stable)

```bash
pnpm -C GoblinOS changeset pre exit
```

## What Happens

### In Prerelease Mode

- Versions: `0.1.0` → `0.1.1-next.0` → `0.1.1-next.1`
- npm tag: `next` (not `latest`)
- Users install with: `pnpm add @goblinos/cli@next`

### Exiting Prerelease

- Next version bump: `0.1.1-next.1` → `0.1.1`
- npm tag: `latest`
- All accumulated changes are in the changelog

## Workflow Examples

### Weekly canary builds

```bash
# Monday: start canary for week's work
pnpm changeset pre enter next

# During week: create changesets normally
pnpm changeset
git add . && git commit -m "feat: new feature"

# Friday: publish canary
pnpm release:next

# Following Monday: exit and release stable
pnpm changeset pre exit
pnpm changeset version
pnpm release
```

### Feature branch prereleases

```bash
# On feature branch
pnpm changeset pre enter alpha
pnpm changeset
pnpm release:alpha

# Consumers test with:
# pnpm add @goblinos/cli@alpha

# When ready, merge to main and exit
pnpm changeset pre exit
```

## Available Tags

- `next` - Weekly canaries, feature previews
- `alpha` - Experimental features
- `beta` - Feature-complete, needs testing
- `rc` - Release candidate

## CI Integration

The release workflow automatically detects prerelease mode and uses the correct tag.

## Docs

- [Changesets Prereleases](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)
