// Temporary shim for the 'ollama' package types used in Overmind
declare module 'ollama' {
  export type ChatRequest = any
  export type ChatResponse = any
  export type EmbeddingsResponse = any
  export type Message = any
  export type Tool = any
  export type ToolDefinition = any
  export type AbortableAsyncIterator<T> = AsyncGenerator<T, any, any>

  export function chat(request: any): Promise<any> | AsyncGenerator<any, any, any>
  export function embeddings(...args: any[]): Promise<any>
  export const OllamaClient: any
}
