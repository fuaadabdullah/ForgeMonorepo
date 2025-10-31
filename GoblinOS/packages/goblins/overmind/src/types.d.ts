// Provide a small compatibility declaration so imports that use the
// runtime `.js` specifier (e.g. `import { LLMProvider } from '../types.js'`)
// resolve to the local `types.ts` during typechecking.
declare module './types.js' {
  export * from './types'
}

// Keep this file a module
export {}
