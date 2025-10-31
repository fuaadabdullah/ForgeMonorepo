#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::Emitter;
// Import the Listener trait to get AppHandle.listen
use tauri::Listener;

// Use the `tray-icon` crate (added as a dependency in Cargo.toml)
use tray_icon::{TrayIconBuilder, TrayIconEvent};
use tray_icon::menu::{Menu, MenuEvent, MenuItem};
use std::cell::RefCell;

// Keep the tray icon in a thread-local RefCell so it can be created on the UI thread
// and doesn't need to be Send/Sync.
thread_local! {
  static TRAY_HANDLE: RefCell<Option<tray_icon::TrayIcon>> = RefCell::new(None);
}

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Optionally attach tauri-plugin-log in debug builds
      if cfg!(debug_assertions) {
        let _ = app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        );
      }

      // Forward tray-icon events into the Tauri event system so the renderer can listen.
      // We emit different event names for click/doubleclick vs generic events to make
      // frontend handling more convenient.
      let app_handle = app.handle().clone();
      TrayIconEvent::set_event_handler(Some(move |event| {
        match event {
          tray_icon::TrayIconEvent::Click { .. } => {
            let _ = app_handle.emit("goblinos:tray-click", format!("{:?}", event));
          }
          tray_icon::TrayIconEvent::DoubleClick { .. } => {
            let _ = app_handle.emit("goblinos:tray-doubleclick", format!("{:?}", event));
          }
          _ => {
            let _ = app_handle.emit("goblinos:tray-event", format!("{:?}", event));
          }
        }
      }));

      // Forward menu events (if any) on a separate channel.
      let menu_app_handle = app.handle().clone();
      MenuEvent::set_event_handler(Some(move |m_event| {
        let _ = menu_app_handle.emit("goblinos:tray-menu", format!("{:?}", m_event));
      }));

      // Create a tray icon with quick actions and keep it in TRAY_HANDLE so it stays alive.
      // Menu entries are forwarded to the frontend via events so the renderer can act.
  let menu = Menu::new();
  // MenuItem::new(text, enabled, accelerator)
  let start_item = MenuItem::new("Start Agents", true, None);
  let stop_item = MenuItem::new("Stop Agents", true, None);
  let open_logs = MenuItem::new("Open Logs", true, None);
  let flush_queue = MenuItem::new("Flush Queue", true, None);
  // Append items (API expects owned items)
  let _ = menu.append(&start_item);
  let _ = menu.append(&stop_item);
  // Add a disabled separator-like item (cross-platform) since the
  // menu API doesn't expose a direct separator helper in this version.
  let _ = menu.append(&MenuItem::new("—", false, None));
  let _ = menu.append(&open_logs);
  let _ = menu.append(&flush_queue);

      if let Ok(tray_icon) = TrayIconBuilder::new()
        .with_tooltip("GoblinOS Hub")
        .with_menu(Box::new(menu))
        .build()
      {
        TRAY_HANDLE.with(|cell| {
          *cell.borrow_mut() = Some(tray_icon);
        });
      }

      // Spawn the GoblinOS API backend (best-effort, non-blocking), but ensure
      // only a single instance is started. We use a two-step approach:
      // 1) attempt a short TCP connect to the backend port (127.0.0.1:8001).
      //    If it responds, assume the backend is already running and skip spawn.
      // 2) if not reachable, create an exclusive lock file in the system temp
      //    directory using create_new(true). This prevents races where multiple
      //    instances try to spawn the backend simultaneously. If the lock file
      //    appears stale (port still closed), we remove it and retry a few times.
      use std::net::TcpStream;
      use std::time::Duration;
  use std::fs::{OpenOptions, remove_file};
  use std::io::Write;

      let backend_addr = "127.0.0.1:8001";
      let lock_path = std::env::temp_dir().join("goblinos_overmind_api.lock");

      // Single-instance lock for the Hub process itself to avoid spawning multiple
      // instances which could each attempt to start backends. If the lock exists
      // we exit early. This is a best-effort local lock using create_new semantics.
      let hub_lock = std::env::temp_dir().join("goblinos_overmind_hub.lock");
      match std::fs::OpenOptions::new().write(true).create_new(true).open(&hub_lock) {
        Ok(mut f) => {
          let _ = write!(f, "{}", std::process::id());
          let _ = f.flush();
        }
        Err(_) => {
          // Another instance likely running — emit an event for diagnostics and exit.
          let _ = app.handle().emit("goblinos:already-running", "another-instance");
          // Give a short grace so the event can be observed, then exit.
          std::thread::sleep(std::time::Duration::from_millis(50));
          std::process::exit(0);
        }
      }

      let backend_running = TcpStream::connect_timeout(&backend_addr.parse().unwrap(), Duration::from_millis(200)).is_ok();

    // Try to read a PID from the lock file and check liveness.
      if backend_running {
        // Backend already listening — nothing to do.
        let _ = app.handle().emit("goblinos:backend-started", "already-running");
      } else {
        // Try to acquire lock and spawn if we get it.
        let mut spawned = false;
        for _attempt in 0..3 {
          // If backend became available in the meantime, stop.
          if TcpStream::connect_timeout(&backend_addr.parse().unwrap(), Duration::from_millis(200)).is_ok() {
            let _ = app.handle().emit("goblinos:backend-started", "started-by-other");
            spawned = true;
            break;
          }

          match OpenOptions::new().write(true).create_new(true).open(&lock_path) {
            Ok(mut file) => {
              // We acquired the lock — spawn the backend.
          if let Ok(mut child) = std::process::Command::new("sh")
                .arg("-c")
                .arg("cd ../../../../../../GoblinOS/packages/goblins/overmind/api && \n                  if command -v python3 >/dev/null 2>&1; then PY=python3; elif command -v python >/dev/null 2>&1; then PY=python; else echo 'no-python'; fi; \n                  $PY -m venv .venv 2>/dev/null || true; source .venv/bin/activate 2>/dev/null || true; $PY -m pip install -r requirements.txt 2>/dev/null || true; PYTHONUNBUFFERED=1 $PY -m uvicorn app.main:app --host 127.0.0.1 --port 8001")
                .spawn()
              {
                // Write child's pid into the lock file for diagnostics.
                let _ = write!(file, "{}", child.id());
                let _ = file.flush();
                let _ = app.handle().emit("goblinos:backend-started", "spawned");
                spawned = true;
            // Spawn a reaper thread that waits for the backend to exit and
            // then removes the lock file to avoid leaving stale locks.
            let lock_clone = lock_path.clone();
            std::thread::spawn(move || {
              let _ = child.wait();
              let _ = std::fs::remove_file(&lock_clone);
            });
                // Detach: don't wait, let it run independently.
              } else {
                // Spawn failed; remove lock so others can try.
                let _ = remove_file(&lock_path);
              }

              break;
            }
            Err(_) => {
              // Lock file exists — check if it's stale. If the backend is still
              // not listening, treat the lock as stale and remove it, then retry.
              if TcpStream::connect_timeout(&backend_addr.parse().unwrap(), Duration::from_millis(200)).is_ok() {
                let _ = app.handle().emit("goblinos:backend-started", "started-by-other");
                spawned = true;
                break;
              }
              // Otherwise remove stale lock and retry (race: tolerable).
              let _ = remove_file(&lock_path);
              // short backoff
              std::thread::sleep(Duration::from_millis(150));
            }
          }
        }

        if !spawned {
          // If we failed to spawn after retries, emit a warning event but do not panic.
          let _ = app.handle().emit("goblinos:backend-started", "spawn-failed");
        }
      }

      // NOTE: Global shortcut registration was removed because the
      // `global-shortcut` feature is not available for the pinned tauri
      // crate version. If/when the workspace upgrades to a tauri release
      // that exposes a compatible global-shortcut feature, re-enable
      // the registration below. For now we keep tray & event forwarding
      // working so the app builds successfully.

      // Try to register a global shortcut to bring the hub to front. This is
      // gated behind the crate feature `global-shortcut` which maps to the
      // `tauri/global-shortcut` feature via `Cargo.toml`. Build with
      // `--features global-shortcut` to enable this behavior.
      #[cfg(feature = "global-shortcut")]
      {
        use tauri::GlobalShortcutManager;
        if let Some(gsm) = app.global_shortcut_manager() {
          let app_handle = app.handle().clone();
          let _ = gsm.register("CmdOrCtrl+Shift+O", move || {
            if let Some(w) = app_handle.get_window("main") {
              let _ = w.show();
              let _ = w.set_focus();
            }
          });
        }
      }

      // Listen for tray menu events and forward as structured actions so the
      // frontend can perform them. The tray-icon crate emits MenuEvent which
      // we already forward to goblinos:tray-menu; parse and emit a higher level
      // goblinos:tray-action event with one of the known action names.
      let menu_forward = app.handle().clone();
      MenuEvent::set_event_handler(Some(move |m_event| {
        // menu event Debug will include id; match on that id string to map action
        // Example debug: MenuEvent { id: "open_logs", .. }
        let payload = format!("{:?}", m_event);
        if payload.contains("Start Agents") {
          let _ = menu_forward.emit("goblinos:tray-action", "start-agents");
        } else if payload.contains("Stop Agents") {
          let _ = menu_forward.emit("goblinos:tray-action", "stop-agents");
        } else if payload.contains("Open Logs") {
          let _ = menu_forward.emit("goblinos:tray-action", "open-logs");
        } else if payload.contains("Flush Queue") {
          let _ = menu_forward.emit("goblinos:tray-action", "flush-queue");
        } else {
          let _ = menu_forward.emit("goblinos:tray-menu", payload);
        }
      }));

      // Notify the frontend that backend has started (frontend will show a native notification)
      let _ = app.handle().emit("goblinos:backend-started", "started");

      // Listen for goblinos:notify events from other parts of the app (backend
      // or renderer). When received we try to show a native notification if the
      // crate feature `notification` is enabled (this is gated so the app
      // continues to compile on older tauri versions). Always forward a
      // `goblinos:notify-ui` event to the renderer so it can show a fallback
      // (web) notification when native notifications aren't available.
  let notify_handle = app.handle().clone();
  // Clone a handle for emitting inside the listener closure to avoid
  // borrow/move conflicts between registering the listener and emitting.
  let emitter_handle = notify_handle.clone();
  // Register the listener using a clone so the original handle isn't moved.
  notify_handle.clone().listen("goblinos:notify", move |event| {
    // event.payload() returns a &str in this tauri version
    let payload = event.payload().to_string();

    // If the maintainer enables the crate feature `notification` (and
    // the workspace upgrades to a Tauri release that exposes a native
    // notification API), the code inside this cfg block will attempt to
    // show a native notification. Keep this gated so current pinned
    // versions that don't expose the API won't break the build.
    #[cfg(feature = "notification")]
    {
      // Use Tauri's notification API when available. This block is
      // compiled only when the `notification` feature is enabled.
      use tauri::api::notification::Notification;
      let _ = Notification::new("GoblinOS")
        .title("GoblinOS")
        .body(&payload)
        .show();
    }

    // Always emit to the renderer so the web UI can display a fallback
    // notification (and also receive telemetry for the notification).
    let _ = emitter_handle.emit("goblinos:notify-ui", payload);
  });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
