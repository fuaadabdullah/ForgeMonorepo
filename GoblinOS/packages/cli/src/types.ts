export type Goblin = {
  name: string
  run(args: Record<string, unknown>): Promise<number>
  // Optional health check used by the CLI health command
  health?: () => Promise<string>
}
