// Compatibility shims for tools example modules using `.js` import specifiers

declare module './examples/weather.js' {
  export * from './examples/weather'
}

declare module './examples/search.js' {
  export * from './examples/search'
}

declare module './examples/memory.js' {
  export * from './examples/memory'
}
