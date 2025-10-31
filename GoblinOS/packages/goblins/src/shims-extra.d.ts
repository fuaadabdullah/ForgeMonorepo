// Temporary shims to reduce TypeScript noise for third-party modules without types.
// Replace with proper @types or SDK types as a follow-up.
declare module 'openai'
declare module 'ollama'
declare module '@opentelemetry/api'
declare module 'opentelemetry'
declare module 'pg'
declare module 'nats'
declare module 'redis'

export {}

// Broad temporary shims for internal/relative JS type modules to reduce compiler noise.
declare module '@goblinos/overmind'
declare module '@goblinos/overmind/*'
declare module '*types.js' {
  const ns: any
  export = ns
}
declare module '*types' {
  const ns: any
  export = ns
}
declare module '*clients/*' {
  const ns: any
  export = ns
}
