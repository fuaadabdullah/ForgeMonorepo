// Temporary shim for opentelemetry resources API changes
declare module '@opentelemetry/resources' {
  // older code expects resourceFromAttributes; provide a permissive stub
  export function resourceFromAttributes(...args: any[]): any
  export type ResourceAttributes = any
}
