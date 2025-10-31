// Minimal temporary shims for missing local types in forge-master
// Short-term: declare as any to unblock the build. Replace with real types later.
declare module './types.js' {
  export type BrainRequest = any
  export type SmithyOvermindContext = any
}
