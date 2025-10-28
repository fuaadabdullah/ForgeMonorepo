export type Goblin = {
  name: string
  run(args: Record<string, unknown>): Promise<number>
  health?: () => Promise<string>
}
