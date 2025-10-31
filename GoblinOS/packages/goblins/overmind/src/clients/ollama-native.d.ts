export function chatOllamaStructured(opts?: any): Promise<any>
export function listOllamaModels(): Promise<any>
export function showOllama(model: string): Promise<any>
export function deleteOllama(model: string): Promise<any>
export function checkHealth(): Promise<{ healthy: boolean; models: number }>
export function embedOllama(
  input: string | string[],
  _model?: string
): Promise<number[] | number[][]>
export function embedOllamaBatch(inputs: string[], _model?: string): Promise<number[][]>
export function chatOllamaTools(opts?: any): Promise<any>
