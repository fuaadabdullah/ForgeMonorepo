import type { Locator, Page } from '@playwright/test'

/**
 * Page Object Model for Chat interface.
 * Encapsulates all interactions with the chat page.
 */
export class ChatPage {
  readonly page: Page
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly typingIndicator: Locator
  readonly messages: Locator
  readonly clearButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.messageInput = page.locator('[data-testid="message-input"]')
    this.sendButton = page.locator('[data-testid="send-button"]')
    this.typingIndicator = page.locator('[data-testid="typing-indicator"]')
    this.messages = page.locator('[data-testid="message"]')
    this.clearButton = page.locator('[data-testid="clear-history"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  /**
   * Navigate to the chat page.
   */
  async goto() {
    await this.page.goto('/chat')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Send a chat message.
   */
  async sendMessage(text: string) {
    await this.messageInput.fill(text)
    await this.sendButton.click()
  }

  /**
   * Wait for assistant response.
   */
  async waitForResponse(timeout = 10000): Promise<string | null> {
    // Wait for new message with 'assistant' role
    const assistantMessage = this.page
      .locator('[data-testid="message"][data-role="assistant"]')
      .last()

    await assistantMessage.waitFor({ state: 'visible', timeout })
    return await assistantMessage.textContent()
  }

  /**
   * Get error message if present.
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
      return await this.errorMessage.textContent()
    } catch {
      return null
    }
  }

  /**
   * Clear chat history.
   */
  async clearHistory() {
    await this.clearButton.click()

    // Confirm if there's a confirmation dialog
    const confirmButton = this.page.locator('[data-testid="confirm-clear"]')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
  }

  /**
   * Get message count.
   */
  async getMessageCount(): Promise<number> {
    return await this.messages.count()
  }

  /**
   * Get message at index.
   */
  async getMessage(index: number): Promise<string | null> {
    const message = this.messages.nth(index)
    await message.waitFor({ state: 'visible' })
    return await message.textContent()
  }

  /**
   * Check if input is enabled.
   */
  async isInputEnabled(): Promise<boolean> {
    return await this.messageInput.isEnabled()
  }

  /**
   * Check if send button is enabled.
   */
  async isSendButtonEnabled(): Promise<boolean> {
    return await this.sendButton.isEnabled()
  }
}
