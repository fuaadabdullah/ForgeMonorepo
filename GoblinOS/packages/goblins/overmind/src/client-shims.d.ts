// Local module shims for Overmind clients (temporary).
// These help TypeScript resolve relative .js imports during triage.

declare module '../clients/litellm-proxy.js' {
  export const litellm: any
}

declare module '../clients/ollama-native.js' {
  export const chatOllamaStructured: any
  export const listModels: any
}

declare module '../clients/ollama-openai.js' {
  export const chatOpenAI: any
}
