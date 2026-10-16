// SPDX-License-Identifier: GPL-3.0-or-later
//! Tauri commands exposed to the frontend.

use crate::device::{self, Battery, Connection, ConnectionInfo, DeviceInfo};
use crate::prefs::{self, NotifyPrefs, SharedPrefs};
use crate::protocol::{
    self, ButtonConfig, DeviceVersion, DpiConfig, LightingConfig, ProfileSettings, REPORT_BUTTON_MAPPING,
    REPORT_DEVICE_VERSION, REPORT_DPI, REPORT_LIGHTING, REPORT_POLLING_RATE, REPORT_PROFILE_SETTINGS, Rgb,
    PACKET_BUTTON_MAPPING, PACKET_DEVICE_VERSION, PACKET_DPI, PACKET_LIGHTING,
};
use crate::sync::{self, SyncStatus};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, State};

pub struct AppState {
    pub conn: Mutex<Option<Connection>>,
    pub notify: SharedPrefs,
}

impl AppState {
    pub fn new(notify: NotifyPrefs) -> Self {
        AppState { conn: Mutex::new(None), notify: Arc::new(Mutex::new(notify)) }
    }
}

#[derive(Serialize)]
pub struct Status {
    pub connected: bool,
    pub device: Option<ConnectionInfo>,
    pub battery: Option<Battery>,
    pub version: Option<DeviceVersion>,
}

fn now_secs() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

fn with_conn<T>(state: &State<AppState>, f: impl FnOnce(&Connection) -> Result<T, String>) -> Result<T, String> {
    let guard = state.conn.lock().map_err(|_| "estado bloqueado".to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "No hay ningún ratón conectado".to_string())?;
    f(conn)
}

fn status_of(conn: &Connection) -> Status {
    let version = conn
        .read(REPORT_DEVICE_VERSION, PACKET_DEVICE_VERSION, 0x01)
        .ok()
        .and_then(|b| protocol::parse_device_version(&b).ok());
    Status {
        connected: conn.is_alive(),
        device: Some(conn.info.clone()),
        battery: Some(conn.battery()),
        version,
    }
}

#[tauri::command]
pub fn list_devices(app: AppHandle, state: State<AppState>) -> Result<Vec<DeviceInfo>, String> {
    let devices = device::list_devices()?;
    if let Ok(guard) = state.conn.lock() {
        if let Some(conn) = guard.as_ref() {
            if !devices.iter().any(|dev|dev.pid == conn.info.pid) {
                conn.alive.store(false,std::sync::atomic::Ordering::Relaxed);
                crate::tray::update(&app,None,false);
            }
        }
    }
    Ok(devices)
}

#[tauri::command]
pub fn connect(app: AppHandle, state: State<AppState>, pid: Option<u16>) -> Result<Status, String> {
    // Drop any previous connection first (this also stops its worker thread).
    {
        let mut guard = state.conn.lock().map_err(|_| "estado bloqueado".to_string())?;
        *guard = None;
    }

    let conn = device::connect(Some(&app), pid, state.notify.clone())?;
    // Warm once. Switching pages thereafter is served by the worker's cache.
    if let Ok(raw) = conn.read(REPORT_PROFILE_SETTINGS,protocol::PACKET_PROFILE_SETTINGS,0) {
        if let Ok(settings) = protocol::parse_profile_settings(&raw) {
            let p = settings.current;
            for (id,len) in [(REPORT_DPI,PACKET_DPI),(REPORT_LIGHTING,PACKET_LIGHTING),
                (REPORT_BUTTON_MAPPING,PACKET_BUTTON_MAPPING),(REPORT_POLLING_RATE,protocol::PACKET_POLLING_RATE)] {
                let _ = conn.read(id,len,p);
            }
        }
    }
    let status = status_of(&conn);

    let mut guard = state.conn.lock().map_err(|_| "estado bloqueado".to_string())?;
    *guard = Some(conn);
    Ok(status)
}

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e|e.to_string())
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    if enabled {
        app.autolaunch().enable().map_err(|e|e.to_string())?;
        #[cfg(windows)] {
            // The plugin's upstream Windows backend doesn't quote paths containing spaces.
            let executable = std::env::current_exe().map_err(|e|e.to_string())?;
            let command = format!("\"{}\" --background",executable.display());
            windows_registry::CURRENT_USER.create("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
                .and_then(|key|key.set_string(&app.package_info().name,command)).map_err(|e|e.to_string())?;
        }
        Ok(())
    } else { app.autolaunch().disable().map_err(|e|e.to_string()) }
}

#[tauri::command]
pub fn status(state: State<AppState>) -> Status {
    match state.conn.lock() {
        Ok(guard) => match guard.as_ref() {
            Some(conn) => status_of(conn),
            None => Status { connected: false, device: None, battery: None, version: None },
        },
        Err(_) => Status { connected: false, device: None, battery: None, version: None },
    }
}

// --------------------------- DPI ---------------------------

#[tauri::command]
pub fn get_dpi(state: State<AppState>, profile_id: u8) -> Result<DpiConfig, String> {
    with_conn(&state, |conn| {
        let raw = conn.read(REPORT_DPI, PACKET_DPI, profile_id)?;
        DpiConfig::parse(&raw)
    })
}

#[tauri::command]
pub fn set_dpi(state: State<AppState>, config: DpiConfig) -> Result<(), String> {
    config.validate()?;
    with_conn(&state, |conn| conn.write(&config.build()))
}

// --------------------------- Lighting ---------------------------

#[tauri::command]
pub fn get_lighting(state: State<AppState>, profile_id: u8) -> Result<LightingConfig, String> {
    with_conn(&state, |conn| {
        let raw = conn.read(REPORT_LIGHTING, PACKET_LIGHTING, profile_id)?;
        LightingConfig::parse(&raw)
    })
}

#[tauri::command]
pub fn set_lighting(state: State<AppState>, config: LightingConfig) -> Result<(), String> {
    config.validate()?;
    with_conn(&state, |conn| conn.write(&config.build()))
}

// --------------------------- Polling rate ---------------------------

#[tauri::command]
pub fn get_polling(state: State<AppState>, profile_id: u8) -> Result<u16, String> {
    with_conn(&state, |conn| {
        let raw = conn.read(REPORT_POLLING_RATE, protocol::PACKET_POLLING_RATE, profile_id)?;
        protocol::parse_polling(&raw)
    })
}

#[tauri::command]
pub fn set_polling(state: State<AppState>, profile_id: u8, rate: u16) -> Result<(), String> {
    protocol::validate_polling(profile_id, rate)?;
    with_conn(&state, |conn| conn.write(&protocol::build_polling(profile_id, rate)))
}

// --------------------------- Buttons ---------------------------

#[tauri::command]
pub fn get_buttons(state: State<AppState>, profile_id: u8) -> Result<ButtonConfig, String> {
    with_conn(&state, |conn| {
        let raw = conn.read(REPORT_BUTTON_MAPPING, PACKET_BUTTON_MAPPING, profile_id)?;
        ButtonConfig::parse(&raw)
    })
}

#[tauri::command]
pub fn set_buttons(state: State<AppState>, config: ButtonConfig) -> Result<(), String> {
    config.validate()?;
    with_conn(&state, |conn| conn.write(&config.build()))
}

// --------------------------- Profiles ---------------------------

#[tauri::command]
pub fn get_profile_settings(state: State<AppState>) -> Result<ProfileSettings, String> {
    with_conn(&state, |conn| {
        let raw = conn.read(REPORT_PROFILE_SETTINGS, protocol::PACKET_PROFILE_SETTINGS, 0x00)?;
        protocol::parse_profile_settings(&raw)
    })
}

#[tauri::command]
pub fn set_profile_settings(state: State<AppState>, current: u8, max: u8) -> Result<(), String> {
    protocol::validate_profile(max)?;
    if current == 0 || current > max { return Err("Perfil actual fuera de rango".into()); }
    with_conn(&state, |conn| conn.write(&protocol::build_profile_settings(current, max)))
}

// --------------------------- Backup export / import ---------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupProfile {
    pub profile_id: u8,
    pub dpi: DpiConfig,
    pub lighting: LightingConfig,
    pub buttons: ButtonConfig,
    pub polling: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Backup {
    pub format: String,
    pub version: u32,
    pub created_at: i64,
    pub product: Option<String>,
    pub profiles: Vec<BackupProfile>,
}

fn export_backup(state: &AppState) -> Result<Backup, String> {
    let guard = state.conn.lock().map_err(|_| "estado bloqueado".to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "No hay ningún ratón conectado".to_string())?;

    let settings = protocol::parse_profile_settings(&conn.read(
        REPORT_PROFILE_SETTINGS,
        protocol::PACKET_PROFILE_SETTINGS,
        0x00,
    )?)?;
    let max = settings.max.clamp(1, protocol::MAX_PROFILES);

    let mut profiles = Vec::new();
    for pid in 1..=max {
        let dpi = DpiConfig::parse(&conn.read(REPORT_DPI, PACKET_DPI, pid)?)?;
        let lighting = LightingConfig::parse(&conn.read(REPORT_LIGHTING, PACKET_LIGHTING, pid)?)?;
        let buttons = ButtonConfig::parse(&conn.read(REPORT_BUTTON_MAPPING, PACKET_BUTTON_MAPPING, pid)?)?;
        let polling =
            protocol::parse_polling(&conn.read(REPORT_POLLING_RATE, protocol::PACKET_POLLING_RATE, pid)?)?;
        profiles.push(BackupProfile { profile_id: pid, dpi, lighting, buttons, polling });
    }

    Ok(Backup {
        format: "as-x11".to_string(),
        version: 1,
        created_at: now_secs(),
        product: Some(conn.info.product.clone()),
        profiles,
    })
}

fn import_backup(state: &AppState, backup: &Backup) -> Result<(), String> {
    if backup.format != "as-x11" {
        return Err("La copia no tiene un formato compatible con AS x11".to_string());
    }
    if backup.version != 1 || backup.profiles.is_empty() || backup.profiles.len() > protocol::MAX_PROFILES as usize {
        return Err("Versión o número de perfiles no válido".into());
    }
    // Validate the entire backup before sending the first persistent write.
    for (i, profile) in backup.profiles.iter().enumerate() {
        if profile.profile_id as usize != i + 1 || profile.dpi.profile_id != profile.profile_id
            || profile.lighting.profile_id != profile.profile_id || profile.buttons.profile_id != profile.profile_id {
            return Err("Identificadores de perfiles incoherentes".into());
        }
        profile.dpi.validate()?;
        profile.lighting.validate()?;
        profile.buttons.validate()?;
        protocol::validate_polling(profile.profile_id, profile.polling)?;
    }
    let guard = state.conn.lock().map_err(|_| "estado bloqueado".to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "No hay ningún ratón conectado".to_string())?;

    for profile in &backup.profiles {
        conn.write(&profile.dpi.build())?;
        conn.write(&profile.lighting.build())?;
        conn.write(&profile.buttons.build())?;
        conn.write(&protocol::build_polling(profile.profile_id, profile.polling))?;
    }

    let max = (backup.profiles.len() as u8).clamp(1, protocol::MAX_PROFILES);
    conn.write(&protocol::build_profile_settings(1, max))?;
    Ok(())
}

#[tauri::command]
pub fn export_config(state: State<AppState>) -> Result<Backup, String> {
    export_backup(&state)
}

#[tauri::command]
pub fn import_config(state: State<AppState>, backup: Backup) -> Result<(), String> {
    import_backup(&state, &backup)
}

// --------------------------- Notifications ---------------------------

#[tauri::command]
pub fn get_notify_prefs(state: State<AppState>) -> Result<NotifyPrefs, String> {
    Ok(state.notify.lock().map_err(|_| "estado bloqueado".to_string())?.clone())
}

#[tauri::command]
pub fn set_notify_prefs(app: AppHandle, state: State<AppState>, prefs: NotifyPrefs) -> Result<(), String> {
    *state.notify.lock().map_err(|_| "estado bloqueado".to_string())? = prefs.clone();
    prefs::save(&app, &prefs);
    Ok(())
}

/// Fire a sample notification so the user can verify the system integration.
#[tauri::command]
pub fn test_notification(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title("AS x11")
        .body("Los avisos de batería funcionan correctamente.")
        .show()
        .map_err(|e| e.to_string())
}

// --------------------------- Google Drive sync ---------------------------

#[tauri::command]
pub fn sync_status(app: AppHandle) -> SyncStatus {
    sync::status(&app)
}

#[tauri::command]
pub fn sync_set_client_id(app: AppHandle, client_id: String) -> SyncStatus {
    sync::set_client_id(&app, client_id)
}

#[tauri::command]
pub async fn sync_connect(app: AppHandle) -> Result<SyncStatus, String> {
    tauri::async_runtime::spawn_blocking(move || sync::connect(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn sync_disconnect(app: AppHandle) -> SyncStatus {
    sync::disconnect(&app)
}

/// Read the whole device configuration and upload it to Google Drive.
#[tauri::command]
pub async fn sync_upload(app: AppHandle, state: State<'_, AppState>) -> Result<SyncStatus, String> {
    let json = {
        let backup = export_backup(&state)?;
        serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?
    };
    tauri::async_runtime::spawn_blocking(move || sync::upload(&app, &json))
        .await
        .map_err(|e| e.to_string())?
}

/// Download the configuration from Google Drive and apply it to the device.
#[tauri::command]
pub async fn sync_download(app: AppHandle, state: State<'_, AppState>) -> Result<SyncStatus, String> {
    let task_app = app.clone();
    let json = tauri::async_runtime::spawn_blocking(move || sync::download(&task_app))
        .await
        .map_err(|e| e.to_string())??;

    let backup: Backup = serde_json::from_str(&json).map_err(|e| format!("Copia no válida: {e}"))?;
    import_backup(&state, &backup)?;
    Ok(sync::status(&app))
}

// --------------------------- Misc ---------------------------

#[tauri::command]
pub fn get_device_version(state: State<AppState>) -> Result<DeviceVersion, String> {
    with_conn(&state, |conn| {
        let raw = conn.read(REPORT_DEVICE_VERSION, PACKET_DEVICE_VERSION, 0x01)?;
        protocol::parse_device_version(&raw)
    })
}

/// Read one DPI stage colour helper used by the lighting preview (kept small).
#[tauri::command]
pub fn default_palette() -> Vec<Rgb> {
    DpiConfig::default().colors
}
