// Global test types for Vitest environment
// Declares a typed global `React` to be used by test setup
declare global {
  // Provide a typed global for internal test use without colliding with existing React globals.
  // Use a unique name to avoid duplicate identifier issues.
  var __REACT_GLOBAL__: typeof import('react');
}

export {};
