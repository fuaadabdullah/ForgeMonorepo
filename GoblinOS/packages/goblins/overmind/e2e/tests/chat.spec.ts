import { expect, test } from '@playwright/test'
import { ChatPage } from '../pages/ChatPage'

test.describe('Chat Functionality', () => {
  let chatPage: ChatPage

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page)
    await chatPage.goto()
  })

  test('should load chat interface', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Overmind/i)

    // Verify chat input is visible
    await expect(chatPage.messageInput).toBeVisible()
    await expect(chatPage.sendButton).toBeVisible()
  })

  test('should send message and receive response', async ({ page }) => {
    // Mock API response
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'The answer is 4',
          model: 'gemini-pro',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          cost: 0.0001,
          timestamp: new Date().toISOString(),
        }),
      })
    })

    await chatPage.sendMessage('Hello, what is 2+2?')

    // Wait for response
    const response = await chatPage.waitForResponse()

    expect(response).toContain('4')
  })

  test('should show typing indicator while processing', async ({ page }) => {
    // Delay the response
    await page.route('**/api/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Response',
          model: 'gemini-pro',
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          cost: 0.00005,
          timestamp: new Date().toISOString(),
        }),
      })
    })

    await chatPage.sendMessage('Test message')

    // Typing indicator should appear
    await expect(chatPage.typingIndicator).toBeVisible()

    // Should disappear after response
    await chatPage.waitForResponse()
    await expect(chatPage.typingIndicator).not.toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await chatPage.sendMessage('Test')

    // Should show error message
    const error = await chatPage.getErrorMessage()
    expect(error).toBeTruthy()
    expect(error).toContain('error')
  })

  test('should display chat history', async ({ page }) => {
    // Mock multiple exchanges
    let callCount = 0
    await page.route('**/api/chat', (route) => {
      callCount++
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `Response ${callCount}`,
          model: 'gemini-pro',
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          cost: 0.00005,
          timestamp: new Date().toISOString(),
        }),
      })
    })

    await chatPage.sendMessage('First message')
    await chatPage.waitForResponse()

    await chatPage.sendMessage('Second message')
    await chatPage.waitForResponse()

    // Should have 4 messages (2 user + 2 assistant)
    const messageCount = await chatPage.messages.count()
    expect(messageCount).toBe(4)
  })

  test('should clear chat history', async ({ page }) => {
    // Add some messages first
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Response',
          model: 'gemini-pro',
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          cost: 0.00005,
          timestamp: new Date().toISOString(),
        }),
      })
    })

    await chatPage.sendMessage('Test')
    await chatPage.waitForResponse()

    // Clear history
    await chatPage.clearHistory()

    // Should have no messages
    const messageCount = await chatPage.messages.count()
    expect(messageCount).toBe(0)
  })
})
