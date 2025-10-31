// Compatibility shims to map `.js` import specifiers to local TS modules
// Used during triage to avoid adding ambient default exports or duplicate
// symbols. These declare the exact relative module specifiers that appear
// across the package so the compiler resolves to the local `.ts` sources.

declare module './clients/litellm-proxy.js' {
  export * from './clients/litellm-proxy'
}

declare module './clients/ollama-native.js' {
  export * from './clients/ollama-native'
}

declare module './clients/ollama-openai.js' {
  export * from './clients/ollama-openai'
}
