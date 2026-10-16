// SPDX-License-Identifier: GPL-3.0-or-later
//! User preferences that are independent of the physical device (notifications,
//! sync options…). Persisted as JSON inside the application config directory.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NotifyPrefs {
    /// Warn when the battery drops below `threshold`.
    pub low_battery: bool,
    /// Battery percentage that triggers the low battery warning.
    pub threshold: u8,
    /// Notify when the battery finishes charging.
    pub charge_full: bool,
}

impl Default for NotifyPrefs {
    fn default() -> Self {
        NotifyPrefs { low_battery: true, threshold: 20, charge_full: true }
    }
}

pub type SharedPrefs = Arc<Mutex<NotifyPrefs>>;

fn prefs_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|dir| dir.join("prefs.json"))
}

pub fn load(app: &AppHandle) -> NotifyPrefs {
    prefs_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(app: &AppHandle, prefs: &NotifyPrefs) {
    let Some(path) = prefs_path(app) else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(prefs) {
        let _ = std::fs::write(path, json);
    }
}
