use std::time::Duration;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // The window starts hidden and the web app shows it after its first
      // render (src/main.tsx), so there is no blank flash on launch.
      // Safety net: show it anyway if that hasn't happened within 3 seconds.
      let handle = app.handle().clone();
      std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(3));
        if let Some(window) = handle.get_webview_window("main") {
          if !window.is_visible().unwrap_or(true) {
            let _ = window.show();
            let _ = window.set_focus();
          }
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running FLUXA");
}
