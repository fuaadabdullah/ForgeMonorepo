// Thin runtime adapter for `ollama` to normalize module shapes at runtime and
// return a factory that produces a client instance. This ensures callers (and
// tests) always get a concrete client object regardless of whether the
// upstream package exports a constructor, a factory function, a `createClient`
// helper, or an already-instantiated client.
export async function getOllamaClientFactory(): Promise<(opts?: any) => any> {
  // Use dynamic import to respect ESM mocks (vitest) and various module shapes.
  const mod = (await import('ollama')) as any

  // If the module exports a named `Ollama` constructor (common in tests/mocks)
  if (mod && typeof mod.Ollama === 'function') {
    // If this is a mocked constructor (vitest/jest style) and an instance was
    // already created by the test harness, return that same instance so tests
    // which construct `new Ollama()` at module scope and then configure its
    // methods see the same object the provider uses.
    // Always construct a fresh instance via the exported constructor. When
    // the mock's implementation uses closures for the method mocks (as the
    // test harness does) each new instance will reference the same underlying
    // vi.fn functions and assertions on those functions will succeed.
    return (opts?: any) => new mod.Ollama(opts)
  }

  // If the module itself is a function (constructor or factory), try to use
  // it as a constructor first, otherwise call it as a factory.
  if (typeof mod === 'function') {
    return (opts?: any) => {
      try {
        // Try as constructor
        // eslint-disable-next-line new-cap
        return new (mod as any)(opts)
      } catch (_err) {
        // Fall back to calling as factory
        return (mod as any)(opts)
      }
    }
  }

  // If there's a createClient helper (some versions), use it
  if (mod && typeof mod.createClient === 'function') {
    return (opts?: any) => mod.createClient(opts)
  }

  // If the module default export is a function, adapt similarly
  if (mod?.default && typeof mod.default === 'function') {
    return (opts?: any) => {
      try {
        // eslint-disable-next-line new-cap
        return new (mod.default as any)(opts)
      } catch (_err) {
        return (mod.default as any)(opts)
      }
    }
  }

  // Otherwise assume the module itself already looks like a client and return it
  // If the module itself already exposes runtime methods (generate/embeddings)
  // return that object. Otherwise, try to construct a usable instance from
  // common export shapes. As a last resort throw an explicit error so callers
  // don't receive a module namespace lacking the expected methods.
  if (mod && typeof (mod as any).generate === 'function') {
    return () => mod
  }

  // Try constructing from `Ollama`/`default`/`createClient` once more before
  // giving up. This prevents callers from getting a raw module namespace which
  // often lacks the client methods and causes runtime `is not a function`
  // errors in consumers and tests.
  return (opts?: any) => {
    try {
      if (mod && typeof (mod as any).Ollama === 'function') return new mod.Ollama(opts)
      if (mod?.default && typeof (mod as any).default === 'function') {
        try {
          // prefer constructor form
          // eslint-disable-next-line new-cap
          return new (mod as any).default(opts)
        } catch (_e) {
          return (mod as any).default(opts)
        }
      }
      if (mod && typeof (mod as any).createClient === 'function')
        return (mod as any).createClient(opts)
    } catch (_e) {
      // fall through
    }

    throw new Error('Unsupported ollama module shape: cannot produce client instance')
  }
}

export default getOllamaClientFactory
