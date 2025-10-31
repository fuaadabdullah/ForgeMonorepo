// Lightweight runtime adapter to normalize the OpenAI client shape.
// Short-term: uses `any` and permissive runtime checks. Replace with
// a typed adapter when we pin the OpenAI SDK version.
export function createOpenAIClient(opts?: any): any {
  // Use require so this works with different module systems at runtime.
  // If the package exposes a class or default, prefer that, else return the module.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('openai') as any
  const OpenAIClass = mod?.OpenAI || mod?.default || mod
  try {
    return typeof OpenAIClass === 'function' ? new OpenAIClass(opts) : OpenAIClass
  } catch (_e) {
    // Fall back to returning the module/object itself
    return OpenAIClass
  }
}

export default createOpenAIClient
