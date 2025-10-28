# E2E tests

This directory contains Playwright end-to-end tests and small helpers used by them.

Files
- `homepage.spec.ts` - basic smoke test for the homepage and dashboard content.
- `test-utils.ts` - small helpers:
  - `waitForAppReady(page, timeout)` — navigates to `/`, waits for `networkidle` and the H1 to appear.
  - `retry(fn, attempts, delayMs)` — retry wrapper for flaky assertions.

Running locally
1. Start the frontend dev server (in `ForgeTM/apps/frontend`):

```bash
pnpm --filter ./ForgeTM/apps/frontend dev
```

2. In another terminal, run Playwright tests (single browser):

```bash
pnpm --filter ./ForgeTM/apps/frontend test:e2e
```

3. To run the full matrix (Chromium/Firefox/WebKit):

```bash
pnpm --filter ./ForgeTM/apps/frontend test:e2e
```

CI-friendly command

From the repository root you can run the CI-friendly script which installs browsers and produces an HTML report:

```bash
pnpm e2e:ci
```

Notes
- The tests expect the frontend to be available at `http://localhost:3000`.
- If your dev server requires environment variables, set them before starting the server.
- The helper `waitForAppReady` is intentionally minimal — expand it with auth flows or feature-flag toggles if needed.
