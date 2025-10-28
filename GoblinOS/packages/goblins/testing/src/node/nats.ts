import type { ConnectionOptions, NatsConnection, StreamConfig } from 'nats'
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers'

export interface NatsOptions {
  /** Docker image to use (default: nats:2.10-alpine) */
  image?: string
  /** Enable JetStream (default: true) */
  enableJetStream?: boolean
  /** Username for NATS authentication */
  username?: string
  /** Password for NATS authentication */
  password?: string
  /** Port to expose (0 = random) */
  port?: number
}

export class NatsTestcontainer {
  private container: StartedTestContainer
  private options: Required<Omit<NatsOptions, 'username' | 'password' | 'port'>> & {
    username?: string
    password?: string
    port?: number
  }
  private _connection?: NatsConnection

  private constructor(
    container: StartedTestContainer,
    options: Required<Omit<NatsOptions, 'username' | 'password' | 'port'>> & {
      username?: string
      password?: string
      port?: number
    }
  ) {
    this.container = container
    this.options = options
  }

  static async start(options: NatsOptions = {}): Promise<NatsTestcontainer> {
    const opts = {
      image: options.image ?? 'nats:2.10-alpine',
      enableJetStream: options.enableJetStream ?? true,
      username: options.username,
      password: options.password,
      port: options.port,
    }

    const command: string[] = ['--name', 'nats-testcontainer']

    // Enable JetStream
    if (opts.enableJetStream) {
      command.push('-js')
    }

    // Add authentication if provided
    if (opts.username && opts.password) {
      command.push('--user', opts.username)
      command.push('--pass', opts.password)
    }

    const containerBuilder = new GenericContainer(opts.image)
      .withCommand(command)
      .withExposedPorts(opts.port ?? 4222)
      .withWaitStrategy(Wait.forLogMessage(/Server is ready/))

    const container = await containerBuilder.start()

    return new NatsTestcontainer(container, opts)
  }

  async stop(): Promise<void> {
    if (this._connection) {
      await this._connection.close()
      this._connection = undefined
    }
    await this.container.stop()
  }

  async getClient(): Promise<NatsConnection> {
    if (!this._connection) {
      // Lazy import to avoid dependency when not used
      const nats = await import('nats')

      const connectionOptions: ConnectionOptions = {
        servers: this.getConnectionString(),
      }

      if (this.options.username && this.options.password) {
        connectionOptions.user = this.options.username
        connectionOptions.pass = this.options.password
      }

      this._connection = await nats.connect(connectionOptions)
    }
    return this._connection
  }

  async createStream(config: StreamConfig): Promise<void> {
    const nc = await this.getClient()
    const jsm = await nc.jetstreamManager()
    await jsm.streams.add(config)
  }

  getConnectionString(): string {
    return `nats://${this.getHost()}:${this.getPort()}`
  }

  getHost(): string {
    return this.container.getHost()
  }

  getPort(): number {
    return this.container.getMappedPort(this.options.port ?? 4222)
  }
}
