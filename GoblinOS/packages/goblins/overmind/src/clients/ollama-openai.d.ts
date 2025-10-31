export const ollamaOpenAI: any
export function chatOllama(
  messages: any[],
  model?: string,
  options?: { temperature?: number; maxTokens?: number; stream?: boolean }
): Promise<any>
export function chatOllamaSync(
  messages: any[],
  model?: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<any>
// Backward-compatible alias expected by some modules
export function chatOpenAI(messages: any, model?: string, options?: any): Promise<any>
export function isOllamaHealthy(): Promise<boolean>
export function listOllamaModels(): Promise<string[]>
