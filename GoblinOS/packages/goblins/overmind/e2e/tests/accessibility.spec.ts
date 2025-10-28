import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Accessibility', () => {
  test('homepage should not have a11y violations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.third-party-widget')
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('chat interface should not have a11y violations', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()

    expect(results.violations).toEqual([])
  })

  test('chat interface should be keyboard navigable', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Tab to message input
    await page.keyboard.press('Tab')
    const focusedInput = await page.locator(':focus')

    // Should focus on input
    await expect(focusedInput).toHaveAttribute('data-testid', 'message-input')

    // Type a message
    await page.keyboard.type('Test message')

    // Tab to send button
    await page.keyboard.press('Tab')
    const focusedButton = await page.locator(':focus')
    await expect(focusedButton).toHaveAttribute('data-testid', 'send-button')

    // Press Enter to send
    await page.keyboard.press('Enter')

    // Message should appear
    await expect(page.locator('text=Test message')).toBeVisible()
  })

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/chat')

    // Check ARIA labels
    const input = page.locator('[data-testid="message-input"]')
    await expect(input).toHaveAttribute('aria-label', /message/i)

    const sendButton = page.locator('[data-testid="send-button"]')
    await expect(sendButton).toHaveAttribute('aria-label', /send/i)

    // Check landmark regions
    const main = page.locator('main')
    await expect(main).toBeVisible()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).include('body').analyze()

    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast')

    expect(contrastViolations).toEqual([])
  })

  test('form elements should have labels', async ({ page }) => {
    await page.goto('/chat')

    const results = await new AxeBuilder({ page }).include('form').analyze()

    const labelViolations = results.violations.filter(
      (v) => v.id === 'label' || v.id === 'aria-input-field-name'
    )

    expect(labelViolations).toEqual([])
  })
})
