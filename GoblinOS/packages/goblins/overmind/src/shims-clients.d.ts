// Short-term shims for relative client modules in Overmind
// These make imports like '../clients/ollama-native.js' resolve during the incremental triage.
// Short-term shims for relative client modules in Overmind
// These make imports like '../clients/ollama-native.js' resolve during the incremental triage.
declare module '../clients/ollama-native.js' {
  export function chat(...args: any[]): any
  export function embeddings(...args: any[]): any
  export const OllamaClient: any
}

declare module '../clients/ollama-openai.js' {
  export function chatOpenAI(...args: any[]): any
}

declare module '../clients/litellm-proxy.js' {
  export const litellm: any
}

declare module '../clients/index.js' {
  export const clients: any
}
