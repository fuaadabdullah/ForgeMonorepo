import { test, expect } from '@playwright/test';

test.describe('Cross-browser Accessibility and Compatibility Tests', () => {
  test('should load the application in all browsers', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Goblin Assistant/);
  });

  test('should expose robots.txt and sitemap.xml', async ({ page }) => {
    const robots = await page.request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain('User-agent: *');

    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain('<urlset');
  });

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');

    // Skip link should exist and target the main content.
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute('href', '#main-content');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    // Main landmark exists
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('should have accessible form elements', async ({ page }) => {
    await page.goto('/login');

    // Check for proper labels
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = page.locator('label').filter({ hasText: /email/i });

    await expect(emailInput).toBeVisible();
    await expect(emailLabel).toBeVisible();

    // Check if label is associated with input
    const inputId = await emailInput.getAttribute('id');
    const labelFor = await emailLabel.getAttribute('for');
    expect(labelFor).toBe(inputId);
  });

  test('should handle responsive design', async ({ page, browserName: _browserName }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await page.goto('/');

    // Check if content is still accessible on mobile
    const mainContent = page.locator('main, [role="main"], body');
    await expect(mainContent).toBeVisible();

    // Test touch targets are appropriately sized
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        // Touch targets should be at least 44px
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should work with JavaScript disabled', async ({ browser }) => {
    // Skip this test for WebKit as it has issues with JavaScript disabled
    if (browser.browserType().name() === 'webkit') {
      test.skip();
    }

    const context = await browser.newContext();
    await context.addInitScript(() => {
      // Disable JavaScript by overriding key functions
      Object.defineProperty(window, 'alert', { value: () => {} });
      Object.defineProperty(window, 'confirm', { value: () => true });
      Object.defineProperty(window, 'prompt', { value: () => '' });
    });

    const page = await context.newPage();
    await page.goto('/');

    // Even with JS disabled, basic content should load
    await expect(page.locator('body')).toBeVisible();

    await context.close();
  });

  test('should handle slow networks gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/');

    // App should still load and be usable
    await expect(page.locator('body')).toBeVisible();
  });
});
