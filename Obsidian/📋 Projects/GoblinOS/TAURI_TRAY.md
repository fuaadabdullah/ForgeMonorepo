# Tauri System Tray — Overmind Dashboard

Summary

- Implemented a native system tray for the Overmind dashboard (Tauri backend).
- Provides three quick actions via the tray menu:
  - Start/Stop Agents
  - Open Logs
  - Flush Queue
- The tray is implemented in the Tauri Rust backend and emits frontend events that the renderer should handle.

Files changed

- `GoblinOS/packages/goblins/overmind/dashboard/src-tauri/Cargo.toml`
  - Pin Tauri to the resolved version and enabled the tray feature:
    - `tauri = { version = "2.9.2", features = ["tray-icon"] }`
  - This enables the crate's tray module and tray-related types.

- `GoblinOS/packages/goblins/overmind/dashboard/src-tauri/src/main.rs`
  - Reworked the Tauri entrypoint to use the v2 tray API:
    - `tauri::menu::MenuBuilder` to create the tray menu
    - `tauri::tray::TrayIconBuilder` to create & register the tray icon
    - Registered an `on_menu_event` handler that emits frontend events or runs fallback commands when the main window is not available.
  - The tray is built in the `setup` closure so the API is spawned and the icon is registered on startup.

Frontend contract (events)

- The Rust tray handlers emit the following events on the Overmind dashboard window (window label: `GoblinOS`):
  - `tray-start-stop-agents` — intended to toggle/start/stop agents
  - `tray-open-logs` — intended to open the logs view/panel in the UI
  - `tray-flush-queue` — intended to flush any queued messages or trigger server-side flush

Recommended renderer code (example)

Add listeners in your renderer entry script (Vite / React / etc.). Example pseudo-code:

```js
// example: src/renderer/tray-listeners.js
import { listen } from '@tauri-apps/api/event';

listen('tray-start-stop-agents', () => {
  console.log('Tray requested: start/stop agents');
  // call your UI action or API here, e.g. toggleAgents()
});

listen('tray-open-logs', () => {
  console.log('Tray requested: open logs');
  // open logs panel or navigate to logs view
});

listen('tray-flush-queue', () => {
  console.log('Tray requested: flush queue');
  // call backend endpoint or frontend action to flush queue
});
```

Testing locally

1) Build the Tauri backend to ensure the Rust bits compile (done during this change):

```bash
cd GoblinOS/packages/goblins/overmind/dashboard/src-tauri
cargo build
```

2) Run the desktop app (your usual Tauri dev workflow). If you use the monorepo tasks, run the Overmind dev stack or the dashboard's dev flow. For example (project tasks):

```bash
# run frontend dev server (Vite)
pnpm dev --filter @goblins/overmind-dashboard
# run Tauri dev (desktop) from the dashboard package
# (adapt to your local dev script if you use a task/alias)
cd GoblinOS/packages/goblins/overmind/dashboard
# for Tauri dev, you may use your local wrapper; otherwise build the binary and run
cargo build && cargo run --bin app
```

3) With the app running, interact with the tray icon and select the menu items. Confirm the frontend receives the events (console logs / UI changes).

Notes & fallback behavior

- If the `GoblinOS` window isn't available when a menu item is selected, the Rust handler attempts a fallback shell command for the start/stop action:
  - `pnpm -C ../../../../.. start-agents || pnpm -C ../../../../.. stop-agents`
  - You can change this in `src-tauri/src/main.rs` to call your exact script(s).

- The implementation intentionally keeps logic in the renderer (UI) and uses the Rust tray only to surface native events. This keeps the UI in control of UX and API interactions.

- If you prefer some actions to be performed in Rust (for example, privileged system commands), we can move the handler logic into Rust and call internal application functions.

Change verification

- I built the Tauri backend after enabling the `tray-icon` feature and updating `main.rs`. `cargo build` finished successfully for the `src-tauri` package in the repo.

Next steps (optional)

- Wire the renderer listeners (I can add the small sender/receiver code to the dashboard renderer and test end-to-end).
- Keep the tray icon handle in app state/resources if you want to explicitly manage its lifetime.
- Add a short unit or integration smoke test to verify the event emission when clicking menu items (platform-specific; may require test harness for native UI events).

If you'd like, I can implement the renderer listeners and run the Overmind dev stack to demo the full end-to-end flow — tell me to proceed and I will wire those changes and run the dev stack for you.
