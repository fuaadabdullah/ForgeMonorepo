// Temporary shim for the OpenAI types used by Overmind
declare module 'openai' {
  // Common types we need to tolerate in the repo
  export type ChatCompletionTool = any
  export type ChatCompletionMessageParam = any
  export type ChatCompletionCreateParamsBase = any
  export type ChatCompletion = any

  export class OpenAI {
    constructor(opts?: any)
    // allow the repo to call chat/completions without strict typing
    chatCompletionsCreate(...args: any[]): any
  }
}
