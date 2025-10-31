// Thin wrapper for Redis client creation to normalize `createClient` vs default exports.
export function createRedisClient(opts?: any): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('redis') as any
  const factory = mod?.createClient || mod?.default?.createClient || mod?.createClient
  if (factory) return factory(opts)
  // If the package exports a client class directly, attempt to instantiate.
  const ClientClass = mod?.RedisClient || mod?.default || mod
  try {
    return typeof ClientClass === 'function' ? new ClientClass(opts) : ClientClass
  } catch (_e) {
    return ClientClass
  }
}

export default createRedisClient
