// Small helper to normalize `nats.connect(...)` usage across module shapes.
export async function connectNats(opts?: any): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('nats') as any
  const connectFn =
    mod?.connect || mod?.default?.connect || (typeof mod === 'function' ? mod : undefined)
  if (connectFn) {
    return connectFn(opts)
  }
  // If the module is an object with methods, return it for tests to stub.
  return mod
}

export default connectNats
