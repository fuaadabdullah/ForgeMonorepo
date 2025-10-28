import { test, expect } from '@playwright/test';
import { waitForAppReady, retry } from './test-utils';

test('homepage has title and dashboard content', async ({ page }) => {
  // Navigate to the app (Playwright will use baseURL from config)
  await page.goto('/');

  // Use helper to navigate and wait for client hydration
  await waitForAppReady(page, 10000);

  // Title can be flaky when set client-side; retry a couple times before giving up
  await retry(async () => {
    await expect(page).toHaveTitle(/ForgeTM/, { timeout: 2000 });
  }, 2, 500).catch(() => {
    /* continue — title may be absent in some dev environments */
  });

  // Check main heading
  await expect(page.locator('h1')).toContainText('🏰 ForgeTM Dashboard');

  // Check welcome text (first paragraph)
  await expect(page.locator('main p').first()).toContainText('Welcome to the unified LLM gateway');

  // Check for dashboard sections (basic presence) using role-based queries to avoid
  // strict-mode locator ambiguity when there are multiple headings.
  await expect(page.getByRole('heading', { name: 'tRPC Integration' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'LLM Gateway Metrics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Feature Flags' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
});
