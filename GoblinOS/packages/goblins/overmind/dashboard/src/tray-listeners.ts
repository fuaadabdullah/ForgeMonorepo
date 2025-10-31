// Renderer-side tiny bridge: listen for Tauri-emitted tray and notification
// events and re-dispatch them as DOM CustomEvents so React components can
// handle them with `window.addEventListener`. Also show a web Notification
// as a fallback when native notifications aren't available.
import { listen } from '@tauri-apps/api/event'

function dispatch(action: string) {
  try {
    window.dispatchEvent(new CustomEvent('tauri-tray-action', { detail: { action } }))
  } catch (e) {
    // safe no-op if dispatch fails
    // keep a console message for visibility during local dev
    // (don't throw — we don't want tray clicks to crash the renderer)
    // eslint-disable-next-line no-console
    console.error('failed to dispatch tray action', action, e)
  }
}

// Listen for the Rust-side high-level action event and re-dispatch.
listen('goblinos:tray-action', (event) => {
  const action = (event?.payload as string) || ''
  if (!action) return
  dispatch(action)
})

// Backwards-compat: if other code emits older-style events, keep them working.
listen('tray-start-stop-agents', () => dispatch('start-stop-agents'))
listen('tray-open-logs', () => dispatch('open-logs'))
listen('tray-flush-queue', () => dispatch('flush-queue'))

// Notification bridge: the Rust side emits `goblinos:notify-ui` with a string
// payload. We try to show a Web Notification as a guaranteed fallback.
listen('goblinos:notify-ui', (event) => {
  const body = (event?.payload as string) || ''
  // Emit a DOM event so components can react (and show UI in-app if desired)
  try {
    window.dispatchEvent(new CustomEvent('goblinos-notify', { detail: { body } }))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('failed to dispatch goblinos-notify', e)
  }

  // Show a web notification as a fallback. Request permission if needed.
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification('GoblinOS', { body })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          // eslint-disable-next-line no-new
          new Notification('GoblinOS', { body })
        }
      })
    }
  }
})

export {}
