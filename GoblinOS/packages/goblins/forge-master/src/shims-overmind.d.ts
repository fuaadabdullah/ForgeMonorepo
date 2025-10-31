// Local shim for forge-master to satisfy imports from '@goblinos/overmind'
// Temporary: export commonly-used named types as any. Replace with proper
// types or ensure package reference resolution is configured.

declare module '@goblinos/overmind' {
  export type Message = any
  export type Task = any
  export type AgentConfig = any
  export type CrewConfig = any
  export type RouterDecision = any
  export type OvermindConfig = any
  export type MemoryManager = any
  export type MemoryConfig = any
  export type MemoryEntry = any
  export type MemorySearchResult = any
}

declare module '@goblinos/overmind/src/memory' {
  export type MemoryManager = any
  export type MemoryConfig = any
  export type MemoryEntry = any
  export type MemorySearchResult = any
}
