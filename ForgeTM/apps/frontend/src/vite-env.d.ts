/// <reference types="vite/client" />

declare namespace ImportMetaEnv {
  interface ViteEnv {
    readonly VITE_API_URL?: string;
  }
}

declare namespace ImportMeta {
  interface Env extends ImportMetaEnv.ViteEnv {}
}
