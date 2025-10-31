# Structured Logging with Pino

Production-grade structured logging for GoblinOS.

## Quick Start

```typescript
import { log } from '@goblinos/shared';

// Simple logging
log.info('Server started');
log.error({ err }, 'Failed to connect');

// Structured context
log.info({ userId: '123', action: 'login' }, 'User logged in');
```

## Development vs Production

**Development mode** (`NODE_ENV !== 'production'`):
- Pretty-printed, colorized output
- Human-friendly timestamps
- Hides pid/hostname noise

**Production mode**:
- JSON output for parsing
- Machine-readable timestamps
- Full metadata for aggregation

Example production output:
```json
{"level":30,"time":1735248000000,"name":"goblinos","env":"production","msg":"Server started"}
```

## Creating Custom Loggers

```typescript
import { createLogger } from '@goblinos/shared';

const log = createLogger({
  name: 'quillwarden',
  level: 'debug' // or use LOG_LEVEL env var
});

log.debug({ vault: '/path/to/vault' }, 'Processing vault');
```

## Child Loggers (Request Context)

```typescript
import { log } from '@goblinos/shared';

function handleRequest(req) {
  const reqLog = log.child({ requestId: req.id, userId: req.user.id });

  reqLog.info('Processing request');
  reqLog.error({ err }, 'Request failed');
  // All logs include requestId and userId automatically
}
```

## Security: Automatic Redaction

These fields are **automatically redacted**:
- `password`, `apiKey`, `token`
- Nested paths: `user.password`, `config.apiKey`

```typescript
log.info({ user: { password: 'secret123' } }, 'User created');
// Output: {"user":{"password":"[REDACTED]"},"msg":"User created"}
```

## Log Levels

From most to least verbose:
- `trace` — ultra-detailed debugging
- `debug` — debugging info
- `info` — general info (default)
- `warn` — warnings
- `error` — errors
- `fatal` — fatal errors (process should exit)

Set via `LOG_LEVEL` env var:
```bash
LOG_LEVEL=debug pnpm dev
```

## Integration with OpenTelemetry (Future)

Pino integrates with OpenTelemetry for distributed tracing. Future work:
1. Add `pino-opentelemetry-transport`
2. Configure trace/span ID injection
3. Export to OTLP collector

## Best Practices

### ✅ Do:
```typescript
log.info({ userId, action: 'purchase', amount }, 'Purchase completed');
log.error({ err, context }, 'Operation failed');
```

### ❌ Don't:
```typescript
log.info('User 123 purchased $50'); // Not parseable
log.error(err.toString()); // Loses stack trace
```

### Structure > String Interpolation
```typescript
// Good
log.info({ vault, noteCount }, 'Vault processed');

// Bad
log.info(`Processed vault ${vault} with ${noteCount} notes`);
```

## Performance

Pino is **5-10x faster** than Winston/Bunyan:
- Asynchronous I/O
- Minimal overhead in hot paths
- Safe JSON serialization

Production benchmarks: ~30,000 logs/sec on a single core.

## Example: Using in a Goblin

```typescript
// packages/goblins/quillwarden/src/index.ts
import { createLogger } from '@goblinos/shared';

const log = createLogger({ name: 'quillwarden' });

export async function runQuillWarden(vaultPath: string) {
  log.info({ vaultPath }, 'Starting QuillWarden');

  try {
    const notes = await scanVault(vaultPath);
    log.info({ noteCount: notes.length }, 'Vault scan complete');
  } catch (err) {
    log.error({ err, vaultPath }, 'Vault scan failed');
    throw err;
  }
}
```

## Viewing Logs

**Development:**
```bash
pnpm dev
# Pretty-printed colored output
```

**Production (JSON):**
```bash
NODE_ENV=production pnpm start | pino-pretty
# Pipe through pino-pretty for human-friendly view
```

**Grep JSON logs:**
```bash
NODE_ENV=production pnpm start | grep '"level":50' # Errors only
NODE_ENV=production pnpm start | jq 'select(.userId == "123")'
```

## Next Steps

- [ ] Add OpenTelemetry integration
- [ ] Configure log rotation (via systemd or pino-roll)
- [ ] Set up centralized log aggregation (e.g., Loki, Elasticsearch)
- [ ] Add log sampling for high-volume events

---

**Related docs:**
- [Production Hardening](./PRODUCTION_HARDENING.md)
- [Setup Guide](./SETUP.md)
