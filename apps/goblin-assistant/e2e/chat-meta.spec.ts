import { test, expect } from '@playwright/test';

test.describe('Chat Model/Cost Visibility', () => {
  test('shows estimate in composer and shows details after reply', async ({ page, context }) => {
    await context.addCookies([
      { name: 'goblin_auth', value: '1', domain: 'localhost', path: '/' },
    ]);

    await page.route('**/api/generate', async route => {
      const body = {
        content: 'Stubbed reply',
        model: 'gpt-4o-mini',
        provider: 'openai',
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        cost_usd: 0.000123,
        correlation_id: 'cid-test-1',
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto('/chat');

    // Composer meta strip should render.
    const meta = page.locator('#chat-composer-meta');
    await expect(meta).toBeVisible();
    await expect(meta).toContainText('Est:');
    await expect(meta).toContainText('Session:');

    // Typing updates estimate.
    const input = page.locator('#chat-input');
    await input.fill('Hello');
    await expect(meta).toContainText('~');

    // Shift+Enter inserts a newline and does not send.
    await input.fill('Line 1');
    await page.keyboard.press('Shift+Enter');
    await expect(input).toHaveValue(/Line 1\n/);

    // Send via Enter (no shift).
    await input.fill('Hello');
    await page.keyboard.press('Enter');

    // Assistant reply should appear.
    await expect(page.getByText('Stubbed reply')).toBeVisible();

    // Expand details and verify model/provider/tokens/cost present.
    const detailsButton = page.getByRole('button', { name: 'Details' }).first();
    await detailsButton.click();
    await expect(page.getByText(/model:\s*gpt-4o-mini/i)).toBeVisible();
    await expect(page.getByText(/provider:\s*openai/i)).toBeVisible();
    await expect(page.getByText(/tokens:\s*15/i)).toBeVisible();
    await expect(page.getByText(/cost:\s*\$0\.0001/i)).toBeVisible();
  });
});
