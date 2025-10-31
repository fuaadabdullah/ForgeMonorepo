export const litellm: {
  createClient: (opts?: any) => any
  embeddings: (opts?: any) => Promise<any>
  chat: any
  modelsList: (opts?: any) => Promise<any>
  modelsListSync?: (opts?: any) => any
}

export function chatLiteLLM(messages: any[], _preferences?: any, options?: any): Promise<any>
export function chatLiteLLMSync(messages: any[], _preferences?: any, options?: any): Promise<any>
export function embedLiteLLM(text: string | string[], _preferences?: any): Promise<any>
export function listProxyModels(): Promise<string[]>
export function checkProxyHealth(): Promise<{ healthy: boolean; version?: string; models?: number }>
