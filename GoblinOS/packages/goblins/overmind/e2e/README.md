---
title: Playwright E2E Testing for Overmind Dashboard
type: how-to
project: GoblinOS/Overmind
status: published
owner: GoblinOS
goblin_name: Overmind E2E Testing
---

# Playwright E2E Testing

End-to-end testing for Overmind Dashboard using [Playwright](https://playwright.dev/).

## Features

- ✅ Cross-browser testing (Chromium, Firefox, WebKit)
- ✅ Visual regression testing with screenshots
- ✅ Accessibility testing (axe-core)
- ✅ API mocking for isolated tests
- ✅ Preview environments per PR
- ✅ Parallel test execution
- ✅ Trace recording for debugging

## Quick Start

### Install Dependencies

```bash
pnpm add -D @playwright/test playwright-axe
pnpm exec playwright install --with-deps
```

### Run Tests

```bash
# Run all tests
pnpm test:e2e

# Run tests in UI mode (interactive)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test file
pnpm test:e2e tests/chat.spec.ts

# Debug mode
pnpm test:e2e --debug
```

### View Test Report

```bash
pnpm exec playwright show-report
```

## Test Structure

```
e2e/
├── tests/
│   ├── chat.spec.ts           # Chat functionality tests
│   ├── memory.spec.ts         # Memory management tests
│   ├── routing.spec.ts        # Model routing tests
│   ├── accessibility.spec.ts  # a11y tests
│   └── visual.spec.ts         # Visual regression tests
├── fixtures/
│   ├── auth.ts                # Authentication fixtures
│   └── api.ts                 # API mocking fixtures
├── pages/
│   ├── ChatPage.ts            # Page Object Models
│   ├── MemoryPage.ts
│   └── SettingsPage.ts
├── playwright.config.ts       # Playwright configuration
└── README.md                  # This file
```

## Example Tests

### Chat Functionality

```typescript
// tests/chat.spec.ts
import { test, expect } from '@playwright/test';
import { ChatPage } from '../pages/ChatPage';

test.describe('Chat Functionality', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.goto();
  });

  test('should send message and receive response', async ({ page }) => {
    await chatPage.sendMessage('Hello, what is 2+2?');

    // Wait for response
    const response = await chatPage.waitForResponse();

    expect(response).toContain('4');
  });

  test('should show typing indicator', async ({ page }) => {
    await chatPage.sendMessage('Test message');

    // Typing indicator should appear
    await expect(chatPage.typingIndicator).toBeVisible();

    // Should disappear after response
    await chatPage.waitForResponse();
    await expect(chatPage.typingIndicator).not.toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await chatPage.sendMessage('Test');

    // Should show error message
    const error = await chatPage.getErrorMessage();
    expect(error).toContain('error');
  });
});
```

### Visual Regression

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for hydration
    await page.waitForLoadState('networkidle');

    // Compare screenshot
    await expect(page).toHaveScreenshot('dashboard-home.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('chat interface with messages', async ({ page }) => {
    await page.goto('/chat');

    // Add some messages (mocked)
    await page.evaluate(() => {
      window.localStorage.setItem('chat-history', JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('chat-with-messages.png');
  });
});
```

### Accessibility Testing

```typescript
// tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should not have a11y violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .exclude('.third-party-widget')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('chat interface should be keyboard navigable', async ({ page }) => {
    await page.goto('/chat');

    // Tab through elements
    await page.keyboard.press('Tab');
    const focused = await page.locator(':focus');

    // Should focus on input
    await expect(focused).toHaveAttribute('placeholder', /type.*message/i);

    // Should be able to submit with Enter
    await page.keyboard.type('Test message');
    await page.keyboard.press('Enter');

    // Message should appear
    await expect(page.locator('text=Test message')).toBeVisible();
  });
});
```

### Page Object Model

```typescript
// pages/ChatPage.ts
import { Page, Locator } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly typingIndicator: Locator;
  readonly messages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.messageInput = page.locator('[data-testid="message-input"]');
    this.sendButton = page.locator('[data-testid="send-button"]');
    this.typingIndicator = page.locator('[data-testid="typing-indicator"]');
    this.messages = page.locator('[data-testid="message"]');
  }

  async goto() {
    await this.page.goto('/chat');
    await this.page.waitForLoadState('networkidle');
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    await this.sendButton.click();
  }

  async waitForResponse() {
    // Wait for new message with 'assistant' role
    const lastMessage = this.messages.last();
    await lastMessage.waitFor({ state: 'visible' });
    return await lastMessage.textContent();
  }

  async getErrorMessage() {
    const error = this.page.locator('[data-testid="error-message"]');
    await error.waitFor({ state: 'visible' });
    return await error.textContent();
  }
}
```

## Configuration

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] }
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright E2E Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run Playwright tests
        run: pnpm test:e2e
        env:
          BASE_URL: http://localhost:5173

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-videos
          path: test-results/**/video.webm
          retention-days: 7
```

## Preview Environments

### Deploy preview per PR

```yaml
# .github/workflows/preview.yml
name: Deploy Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        id: vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

      - name: Run E2E tests against preview
        run: pnpm test:e2e
        env:
          BASE_URL: ${{ steps.vercel.outputs.preview-url }}

      - name: Comment preview URL on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployed: ${{ steps.vercel.outputs.preview-url }}\n\n✅ E2E tests passed`
            })
```

## Best Practices

1. **Use Page Object Models** - Encapsulate page interactions
2. **Wait for stable state** - Use `waitForLoadState('networkidle')`
3. **Mock API responses** - Isolate frontend tests
4. **Test data attributes** - Use `[data-testid]` for selectors
5. **Visual regression** - Update baselines on intentional changes
6. **Accessibility first** - Run axe on every page
7. **Parallel execution** - Use `fullyParallel: true`
8. **Trace on failure** - Enable trace for debugging

## Debugging

### View trace

```bash
pnpm exec playwright show-trace trace.zip
```

### Run with debugger

```bash
pnpm test:e2e --debug
```

### Codegen (record tests)

```bash
pnpm exec playwright codegen http://localhost:5173
```

### UI mode (interactive)

```bash
pnpm test:e2e:ui
```

## Troubleshooting

### "Test timeout exceeded"

Increase timeout in test or config:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60s timeout
  // ...
});
```

### "Screenshot mismatch"

Update baseline:

```bash
pnpm test:e2e --update-snapshots
```

### "Browser not found"

Reinstall browsers:

```bash
pnpm exec playwright install --with-deps
```

## References

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

## License

MIT
