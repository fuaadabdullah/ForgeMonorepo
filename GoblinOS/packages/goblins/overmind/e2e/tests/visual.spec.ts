import { expect, test } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('dashboard homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Hide dynamic elements
    await page.addStyleTag({
      content: `
        [data-dynamic="timestamp"],
        [data-dynamic="uptime"] {
          visibility: hidden !important;
        }
      `,
    })

    await expect(page).toHaveScreenshot('dashboard-home.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('chat interface empty state', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('chat-empty.png', {
      fullPage: false,
      maxDiffPixels: 50,
    })
  })

  test('chat interface with messages', async ({ page }) => {
    await page.goto('/chat')

    // Mock chat history
    await page.evaluate(() => {
      const history = [
        { role: 'user', content: 'Hello, how are you?', timestamp: '2025-10-25T10:00:00Z' },
        {
          role: 'assistant',
          content: "I'm doing well! How can I help you today?",
          timestamp: '2025-10-25T10:00:01Z',
        },
        { role: 'user', content: 'What is 2+2?', timestamp: '2025-10-25T10:00:10Z' },
        { role: 'assistant', content: 'The answer is 4.', timestamp: '2025-10-25T10:00:11Z' },
      ]

      window.localStorage.setItem('chat-history', JSON.stringify(history))
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Hide timestamps for consistent screenshots
    await page.addStyleTag({
      content: `
        [data-testid="message-timestamp"] {
          visibility: hidden !important;
        }
      `,
    })

    await expect(page).toHaveScreenshot('chat-with-messages.png', {
      maxDiffPixels: 100,
    })
  })

  test('memory management interface', async ({ page }) => {
    await page.goto('/memory')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('memory-interface.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('settings page', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('settings-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('mobile viewport - chat interface', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('chat-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('dark mode', async ({ page }) => {
    await page.goto('/')

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })

    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })
})
