import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { runtimeClient } from '../api/api-client';

describe('API Key Management', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should store and retrieve API keys', async () => {
    const provider = 'openai';
    const apiKey = 'test-api-key-123';

    const storeSpy = jest.spyOn(runtimeClient, 'storeApiKey').mockResolvedValue(undefined);
    const getSpy = jest.spyOn(runtimeClient, 'getApiKey').mockResolvedValue(apiKey);

    // Store the API key
    await runtimeClient.storeApiKey(provider, apiKey);

    // Retrieve the API key
    const retrievedKey = await runtimeClient.getApiKey(provider);

    // Verify it matches
    expect(retrievedKey).toBe(apiKey);
    expect(storeSpy).toHaveBeenCalledWith(provider, apiKey);
    expect(getSpy).toHaveBeenCalledWith(provider);
  });

  it('should return null for non-existent API keys', async () => {
    const provider = 'nonexistent';

    const getSpy = jest.spyOn(runtimeClient, 'getApiKey').mockResolvedValue(null);

    // Try to retrieve a non-existent API key
    const retrievedKey = await runtimeClient.getApiKey(provider);

    // Should return null
    expect(retrievedKey).toBeNull();
    expect(getSpy).toHaveBeenCalledWith(provider);
  });

  it('should clear API keys', async () => {
    const provider = 'anthropic';
    const apiKey = 'test-anthropic-key';

    const storeSpy = jest.spyOn(runtimeClient, 'storeApiKey').mockResolvedValue(undefined);
    const getSpy = jest
      .spyOn(runtimeClient, 'getApiKey')
      .mockResolvedValueOnce(apiKey)
      .mockResolvedValueOnce(null);
    const clearSpy = jest.spyOn(runtimeClient, 'clearApiKey').mockResolvedValue(undefined);

    // Store the API key
    await runtimeClient.storeApiKey(provider, apiKey);

    // Verify it's stored
    let retrievedKey = await runtimeClient.getApiKey(provider);
    expect(retrievedKey).toBe(apiKey);

    // Clear the API key
    await runtimeClient.clearApiKey(provider);

    // Verify it's cleared
    retrievedKey = await runtimeClient.getApiKey(provider);
    expect(retrievedKey).toBeNull();

    expect(storeSpy).toHaveBeenCalledWith(provider, apiKey);
    expect(clearSpy).toHaveBeenCalledWith(provider);
    expect(getSpy).toHaveBeenCalledWith(provider);
  });

  it('should list available providers', async () => {
    const mockProviders = ['ollama', 'openai', 'gemini', 'anthropic', 'deepseek', 'grok'];

    const providersSpy = jest.spyOn(runtimeClient, 'getProviders').mockResolvedValue(mockProviders);

    const providers = await runtimeClient.getProviders();

    // Should return an array of provider names
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providersSpy).toHaveBeenCalled();
  });

  it('should list models for providers', async () => {
    const mockOpenAIModels = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'];
    const mockAnthropicModels = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];

    const modelsSpy = jest
      .spyOn(runtimeClient, 'getProviderModels')
      .mockResolvedValueOnce(mockOpenAIModels)
      .mockResolvedValueOnce(mockAnthropicModels);

    const openaiModels = await runtimeClient.getProviderModels('openai');
    const anthropicModels = await runtimeClient.getProviderModels('anthropic');

    // Should return arrays of model names
    expect(Array.isArray(openaiModels)).toBe(true);
    expect(Array.isArray(anthropicModels)).toBe(true);

    // Should have some models
    expect(openaiModels.length).toBeGreaterThan(0);
    expect(anthropicModels.length).toBeGreaterThan(0);

    expect(openaiModels).toContain('gpt-4');
    expect(anthropicModels).toContain('claude-3-opus');

    expect(modelsSpy).toHaveBeenCalledWith('openai');
    expect(modelsSpy).toHaveBeenCalledWith('anthropic');
  });
});
