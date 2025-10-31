// Minimal local shims to satisfy explicit .js imports used in source files.
// Keep these extremely small to avoid naming collisions with real type defs.

// Re-export the real client modules so imports that include the '.js'
// extension resolve to the same exported types as the TypeScript sources.
// This avoids duplicate ambient declarations while allowing runtime
// imports that include the .js extension to type-check.
declare module '../clients/litellm-proxy.js' {
  // Re-export named symbols from the TS source. Intentionally avoid
  // re-exporting the default here so we don't create duplicate synthesized
  // `_default` ambient symbols that collide with the compiled sources.
  export * from '../clients/litellm-proxy'
}

declare module '../clients/ollama-native.js' {
  export * from '../clients/ollama-native'
}

declare module '../clients/ollama-openai.js' {
  export * from '../clients/ollama-openai'
}

export {}
