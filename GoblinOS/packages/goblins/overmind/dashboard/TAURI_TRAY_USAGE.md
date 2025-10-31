# Tauri Tray — Usage & Dev verification

This file documents the developer-facing behavior of the Overmind dashboard system tray and quick actions.

What the tray does

- Emits events from the Rust main process to the renderer (via Tauri events):
  - `goblinos:tray-action` (high-level unified action emitter; payload is a short action string)
  - `goblinos:notify-ui` (notification messages forwarded to the renderer)
  - legacy/compat:
    - `tray-start-stop-agents`
    - `tray-open-logs`
    - `tray-flush-queue`

- The renderer listens and forwards these to the React app as a DOM event `tauri-tray-action` with `detail.action` equal to one of:
  - `start-agents`, `stop-agents`, `start-stop-agents`, `open-logs`, `flush-queue`.

Notification flow

- Rust side: emit `goblinos:notify` (internal) with a short string payload when jobs complete or fail.
- Rust side (lib): listens for `goblinos:notify` and will attempt to show a native notification when compiled with the `notification` crate feature; regardless, it forwards `goblinos:notify-ui` to the renderer as a guaranteed fallback.
- Renderer side: listens for `goblinos:notify-ui` and will show a Web Notification (requests permission if needed) and emit a DOM `goblinos-notify` event so React can display in-app toasts.

Developer fallback behavior

- A small native helper `run_shell(cmd)` is available (only in debug builds) so the renderer can request a shell command to run when needed. This is intentionally limited to dev builds — the invoke handler is not registered in release builds.

Where to look

- Rust main (spawns backend, emits tray events): `src-tauri/src/main.rs` and `src-tauri/src/lib.rs`
- Renderer bridge (forwards events & shows web notifications): `src/tray-listeners.ts`
- React wiring (handles actions): `src/App.tsx` (AuthenticatedApp)

Quick verification steps (macOS / zsh)

1) Ensure dependencies & venv are available (adjust paths if you keep venv elsewhere):

```zsh
# from repo root
cd /Users/fuaadabdullah/ForgeMonorepo

# ensure Forge backend venv exists and packages are installed
cd ForgeTM/apps/backend
source .venv/bin/activate
pip install -r requirements.txt  # if you maintain a requirements file
deactivate
```

2) Start the Overmind dashboard in dev (this will start frontend dev server):

```zsh
# Start the GoblinOS dashboard package in dev (uses pnpm)
pnpm -C GoblinOS/packages/goblins/overmind/dashboard dev

# Alternatively, use the VS Code task: "🎛️ Overmind: dev stack" to start the full stack
```

3) Launch the Tauri app in dev (native wrapper + tray)

```zsh
# from the dashboard package directory
cd GoblinOS/packages/goblins/overmind/dashboard
pnpm exec tauri dev
```

Build-time feature hints

If you want to enable native notifications or global shortcut support at build time (after upgrading Tauri to a release that exposes the compatible features), build the Rust crate with the corresponding features. From the `src-tauri/` directory:

```zsh
# enable native-notifications (if the workspace Tauri exposes the notification API)
cargo build --features notification

# enable global shortcut support (if available in that Tauri release)
cargo build --features global-shortcut
```

4) Interact with the tray

- Use the system tray menu items: Start/Stop Agents, Open Logs, Flush Queue.
- Watch the dashboard window: Open Logs should try to navigate to the most recent failed job run if the backend responds.
- When Start/Stop or Flush Queue run, you should see a short alert or toast with the result (dev feedback). Replace with toast notifications later.

Notes & next improvements

- Replace simple alert() feedback with the app's toast system or native notifications for better UX.
- Consider adding explicit admin HTTP endpoints (recommended) instead of shell fallbacks:
  - `POST /api/v1/admin/agents/start`
  - `POST /api/v1/admin/agents/stop`
  - `POST /api/v1/admin/queue/flush`
- For production, remove `run_shell` or restrict its allowed commands.
# Tauri Tray — Usage & Dev verification

This file documents the developer-facing behavior of the Overmind dashboard system tray and quick actions.

What the tray does

- Emits events from the Rust main process to the renderer (via Tauri events):
 - Emits events from the Rust main process to the renderer (via Tauri events):
  - `goblinos:tray-action` (high-level unified action emitter; payload is a short action string)
  - `goblinos:notify-ui` (notification messages forwarded to the renderer)
  - legacy/compat:
    - `tray-start-stop-agents`
    - `tray-open-logs`
    - `tray-flush-queue`

- The renderer listens and forwards these to the React app as a DOM event `tauri-tray-action` with `detail.action` equal to:
 - The renderer listens and forwards these to the React app as a DOM event `tauri-tray-action` with `detail.action` equal to one of:
  - `start-agents`, `stop-agents`, `start-stop-agents`, `open-logs`, `flush-queue`.

Notification flow

- Rust side: emit `goblinos:notify` (internal) with a short string payload when jobs complete or fail.
- Rust side (lib): listens for `goblinos:notify` and will attempt to show a native notification when compiled with the `notification` crate feature; regardless, it forwards `goblinos:notify-ui` to the renderer as a guaranteed fallback.
- Renderer side: listens for `goblinos:notify-ui` and will show a Web Notification (requests permission if needed) and emit a DOM `goblinos-notify` event so React can display in-app toasts.

Developer fallback behavior

- A small native helper `run_shell(cmd)` is available (only in debug builds) so the renderer can request a shell command to run when needed. This is intentionally limited to dev builds — the invoke handler is not registered in release builds.

Where to look

- Rust main (spawns backend, emits tray events): `src-tauri/src/main.rs`
- Renderer bridge (forwards events): `src/tray-listeners.ts`
- React wiring (handles actions): `src/App.tsx` (AuthenticatedApp)
 - Rust main (spawns backend, emits tray events): `src-tauri/src/main.rs` and `src-tauri/src/lib.rs`
 - Renderer bridge (forwards events & shows web notifications): `src/tray-listeners.ts`
 - React wiring (handles actions): `src/App.tsx` (AuthenticatedApp)

Quick verification steps (macOS / zsh)

1) Ensure dependencies & venv are available (adjust paths if you keep venv elsewhere):

```zsh
# from repo root
cd /Users/fuaadabdullah/ForgeMonorepo

# ensure Forge backend venv exists and packages are installed
cd ForgeTM/apps/backend
source .venv/bin/activate
pip install -r requirements.txt  # if you maintain a requirements file
deactivate
```

2) Start the Overmind dashboard in dev (this will start frontend dev server and the Tauri dev wrapper):

```zsh
# Start the GoblinOS dashboard package in dev (uses pnpm)
pnpm -C GoblinOS dev

# Alternatively, use the VS Code task: "🎛️ Overmind: dev stack" to start the full stack
```

3) Launch the Tauri app in dev (inside the dashboard package):

```zsh
cd GoblinOS/packages/goblins/overmind/dashboard
pnpm dev     # (starts the Vite dev server)

To run the Tauri wrapper (native window + tray) in dev mode:

```zsh
# from the dashboard package directory
pnpm exec tauri dev
```

If you want to enable native notifications or global shortcut support at build time (after upgrading Tauri to a release that exposes the compatible features), build the Rust crate with the corresponding features. From the `src-tauri/` directory:

```zsh
# enable native-notifications (if the workspace Tauri exposes the notification API)
cargo build --features notification

# enable global shortcut support (if available in that Tauri release)
cargo build --features global-shortcut
```
```

4) Interact with the tray

- Use the system tray menu items: Start/Stop Agents, Open Logs, Flush Queue.
- Watch the dashboard window: Open Logs should try to navigate to the most recent failed job run if the backend responds.
- When Start/Stop or Flush Queue run, you should see a short alert with the result (dev feedback). Replace with toast notifications later.

Notes & next improvements

- Replace simple alert() feedback with the app's toast system or native notifications for better UX.
- Consider adding explicit admin HTTP endpoints (recommended) instead of shell fallbacks:
  - `POST /api/v1/admin/agents/start`
  - `POST /api/v1/admin/agents/stop`
  - `POST /api/v1/admin/queue/flush`
- For production, remove `run_shell` or restrict its allowed commands.
