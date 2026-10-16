// SPDX-License-Identifier: GPL-3.0-or-later
mod commands;
pub mod device;
pub mod prefs;
pub mod protocol;
pub mod sync;
mod tray;

use commands::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| tray::show(app)))
        .plugin(tauri_plugin_autostart::Builder::new().args(["--background"]).build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Load persisted preferences before any command can read them.
            let prefs = prefs::load(&app.handle());
            app.manage(AppState::new(prefs));
            tray::setup(app.handle())?;
            // Preserve a checkbox choice when moving from a portable build to an installed one.
            use tauri_plugin_autostart::ManagerExt;
            if app.autolaunch().is_enabled().unwrap_or(false) {
                commands::set_autostart(app.handle().clone(),true).map_err(std::io::Error::other)?;
            }
            if std::env::args().any(|a| a == "--background") {
                if let Some(window) = app.get_webview_window("main") { let _ = window.hide(); }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event { api.prevent_close(); let _ = window.hide(); }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_devices,
            commands::connect,
            commands::get_autostart,
            commands::set_autostart,
            commands::status,
            commands::get_dpi,
            commands::set_dpi,
            commands::get_lighting,
            commands::set_lighting,
            commands::get_polling,
            commands::set_polling,
            commands::get_buttons,
            commands::set_buttons,
            commands::get_profile_settings,
            commands::set_profile_settings,
            commands::export_config,
            commands::import_config,
            commands::get_notify_prefs,
            commands::set_notify_prefs,
            commands::test_notification,
            commands::sync_status,
            commands::sync_set_client_id,
            commands::sync_connect,
            commands::sync_disconnect,
            commands::sync_upload,
            commands::sync_download,
            commands::get_device_version,
            commands::default_palette,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
