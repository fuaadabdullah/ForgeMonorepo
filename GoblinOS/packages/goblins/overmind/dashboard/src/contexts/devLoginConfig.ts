export const DEV_LOGIN_ENABLED = (import.meta.env.VITE_DEV_LOGIN_ENABLED ?? 'true') !== 'false'

export const DEV_LOGIN_USERNAME =
  import.meta.env.VITE_DEV_LOGIN_USERNAME ?? import.meta.env.VITE_DEV_LOGIN_USER ?? 'fuaadabdullah'

export const DEV_LOGIN_PASSWORD =
  import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? import.meta.env.VITE_DEV_LOGIN_PASS ?? 'Atilla2025?#!'

export const DEV_LOGIN_EMAIL =
  import.meta.env.VITE_DEV_LOGIN_EMAIL ?? `${DEV_LOGIN_USERNAME.replace(/\s+/g, '.')}@local.dev`

export const DEV_LOGIN_FULL_NAME =
  import.meta.env.VITE_DEV_LOGIN_FULL_NAME ??
  import.meta.env.VITE_DEV_LOGIN_NAME ??
  'Forge Emergency Access'
