import type { Page } from '@playwright/test';

export async function waitForAppReady(page: Page, timeout = 10000) {
  // Navigate and wait for network to settle so client JS can run and hydrate
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait for the main heading to be visible — indicates the client has hydrated
  await page.locator('h1', { hasText: '🏰 ForgeTM Dashboard' }).waitFor({ timeout });
}

export async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  // Re-throw preserving original error shape — narrow to `unknown` and rethrow
  throw lastError as Error;
}
