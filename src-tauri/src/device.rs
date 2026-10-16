// SPDX-License-Identifier: GPL-3.0-or-later
//! HID transport and device management.
//!
//! The mouse exposes a vendor HID collection that speaks through **feature reports**.
//! Writes use a 64-byte buffer and reads require a two-step
//! "permission" handshake. All access to the physical device is funnelled through a
//! single worker thread so that transfers are serialised and the HID handles never
//! have to cross a thread boundary.

use crate::prefs::SharedPrefs;
use crate::protocol::{self, REPORT_DEVICE_VERSION, REPORT_READ_PERMISSION};
use hidapi::{HidApi, HidDevice};
use serde::Serialize;
use std::ffi::CString;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::atomic::AtomicU64;
static FEATURE_READS: AtomicU64 = AtomicU64::new(0);
/// Diagnostic counter; not exposed in the product UI.
pub fn feature_read_count() -> u64 { FEATURE_READS.load(Ordering::Relaxed) }
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub const VID: u16 = 0x1d57;
pub const PID_WIRED: u16 = 0xfa55;
pub const PID_WIRELESS: u16 = 0xfa60;
pub const PID_R1: u16 = 0xfa61;

const USAGE_PAGE_COMMAND: u16 = 0x000b;
const USAGE_PAGE_EVENTS: u16 = 0x000a;

/// Human readable information about a physical HID collection.
#[derive(Clone, Debug, Serialize)]
pub struct DeviceInfo {
    pub path: String,
    pub product: String,
    pub pid: u16,
    pub connection: String,
    pub interface: i32,
    pub usage_page: u16,
    pub usage: u16,
}

/// Information about an established connection.
#[derive(Clone, Debug, Serialize)]
pub struct ConnectionInfo {
    pub pid: u16,
    pub connection: String,
    pub product: String,
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct Battery {
    pub known: bool,
    pub status: u8,
    pub percentage: i32,
    pub charging: bool,
}

impl Battery {
    fn update(&mut self, status: u8, percentage: i32) {
        self.known = true;
        self.status = status;
        self.percentage = percentage.clamp(0, 100);
        self.charging = matches!(status, 2 | 3);
    }
}

fn connection_kind(pid: u16) -> &'static str {
    match pid {
        PID_WIRED => "wired",
        PID_WIRELESS => "wireless",
        PID_R1 => "r1",
        _ => "unknown",
    }
}

fn pid_label(pid: u16) -> &'static str {
    match pid {
        PID_WIRED => "Cable USB",
        PID_WIRELESS => "Inalámbrico 2.4 GHz",
        PID_R1 => "Receptor R1",
        _ => "Desconocido",
    }
}

// ---------------------------------------------------------------------------
// Enumeration
// ---------------------------------------------------------------------------

fn collect(api: &HidApi, wanted_usage: u16, iface: Option<i32>) -> Vec<(u16, CString, DeviceInfo)> {
    let mut out = Vec::new();
    for dev in api.device_list() {
        if dev.vendor_id() != VID {
            continue;
        }
        let pid = dev.product_id();
        if !matches!(pid, PID_WIRED | PID_WIRELESS) {
            continue;
        }
        if let Some(wanted) = iface {
            if dev.interface_number() != wanted {
                continue;
            }
        }
        if dev.usage_page() != wanted_usage {
            continue;
        }
        let info = DeviceInfo {
            path: dev.path().to_string_lossy().into_owned(),
            product: dev.product_string().unwrap_or("Attack Shark X11").to_string(),
            pid,
            connection: connection_kind(pid).to_string(),
            interface: dev.interface_number(),
            usage_page: dev.usage_page(),
            usage: dev.usage(),
        };
        out.push((pid, dev.path().to_owned(), info));
    }
    out
}

/// List every command-capable HID collection currently present.
pub fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    let api = HidApi::new().map_err(|e| format!("No se pudo inicializar HID: {e}"))?;
    Ok(collect(&api, USAGE_PAGE_COMMAND, Some(2)).into_iter().map(|(_, _, info)| info).collect())
}

fn find_pair(api: &HidApi, pid: u16) -> Option<(CString, CString, DeviceInfo)> {
    // The command vendor collection lives on interface 2 on every link. The event
    // collection is usually there too, but on some 2.4 GHz receivers it can sit on a
    // different interface, so we search all of them and fall back to the command
    // handle if nothing is found.
    let cmds = collect(api, USAGE_PAGE_COMMAND, Some(2));
    let cmds = cmds.into_iter().find(|(p, _, _)| *p == pid)?;
    let evt = collect(api, USAGE_PAGE_EVENTS, None).into_iter().find(|(p, _, _)| *p == pid);
    let evt_path = evt.map(|(_, p, _)| p).unwrap_or_else(|| cmds.1.clone());
    Some((cmds.1, evt_path, cmds.2))
}

// ---------------------------------------------------------------------------
// Worker thread
// ---------------------------------------------------------------------------

enum Job {
    Read { report_id: u8, read_len: u8, param: u8, reply: Sender<Result<Vec<u8>, String>> },
    Write { data: Vec<u8>, reply: Sender<Result<(), String>> },
    Stop,
}

pub struct Connection {
    tx: Sender<Job>,
    join: Option<JoinHandle<()>>,
    pub info: ConnectionInfo,
    pub battery: Arc<Mutex<Battery>>,
    pub alive: Arc<AtomicBool>,
}

impl Connection {
    pub fn read(&self, report_id: u8, read_len: u8, param: u8) -> Result<Vec<u8>, String> {
        let (tx, rx) = mpsc::channel();
        self.tx
            .send(Job::Read { report_id, read_len, param, reply: tx })
            .map_err(|_| "La conexión se ha cerrado".to_string())?;
        rx.recv_timeout(Duration::from_secs(5))
            .map_err(|_| "Se agotó el tiempo de espera leyendo del ratón".to_string())?
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        let (tx, rx) = mpsc::channel();
        self.tx
            .send(Job::Write { data: data.to_vec(), reply: tx })
            .map_err(|_| "La conexión se ha cerrado".to_string())?;
        rx.recv_timeout(Duration::from_secs(5))
            .map_err(|_| "Se agotó el tiempo de espera escribiendo en el ratón".to_string())?
    }

    pub fn battery(&self) -> Battery {
        self.battery.lock().map(|b| b.clone()).unwrap_or_default()
    }
    pub fn is_alive(&self) -> bool { self.alive.load(Ordering::Relaxed) }
}

impl Drop for Connection {
    fn drop(&mut self) {
        let _ = self.tx.send(Job::Stop);
        if let Some(handle) = self.join.take() {
            let _ = handle.join();
        }
    }
}

/// Length of the vendor feature report header used for the read-permission
/// handshake. The permission command (`0xA0`) is an 8-byte report.
const PERMISSION_LEN: usize = 8;

/// Minimum spacing between feature-report *commands* (read-permission requests and
/// writes). The X11 firmware hangs if commands arrive faster than this; the vendor
/// driver recommends at least 250 ms (more on the 2.4 GHz link, where a command
/// round-trip over RF takes ~220 ms).
const COMMAND_SPACING: Duration = Duration::from_millis(300);

/// Delay after a read-permission request before checking whether it was granted.
const PERMISSION_DELAY: Duration = Duration::from_millis(250);

/// Enforce the minimum spacing between commands, then mark "now" as the last command.
fn space_commands(last: &mut Option<Instant>) {
    if let Some(t) = *last {
        let elapsed = t.elapsed();
        if elapsed < COMMAND_SPACING {
            thread::sleep(COMMAND_SPACING - elapsed);
        }
    }
    *last = Some(Instant::now());
}

fn read_report(
    cmd: &HidDevice,
    report_id: u8,
    read_len: u8,
    param: u8,
    last_cmd: &mut Option<Instant>,
) -> Result<Vec<u8>, String> {
    FEATURE_READS.fetch_add(1,Ordering::Relaxed);
    // 1. Ask the firmware for permission to read the requested report (one command).
    space_commands(last_cmd);
    let mut perm = [0u8; PERMISSION_LEN];
    perm[0] = REPORT_READ_PERMISSION;
    perm[1] = report_id;
    perm[2] = read_len;
    perm[4] = param;
    cmd.send_feature_report(&perm).map_err(|e| format!("No se pudo solicitar permiso: {e}"))?;

    // 2. Wait for the firmware to grant permission, then check a few times. The
    //    status must be read as its real 8-byte report: asking for more makes the
    //    device fail (0x1F), which is why the wireless link used to read garbage.
    let mut granted = false;
    for attempt in 0..5 {
        thread::sleep(if attempt == 0 { PERMISSION_DELAY } else { Duration::from_millis(150) });
        let mut status = [0u8; PERMISSION_LEN];
        status[0] = REPORT_READ_PERMISSION;
        if let Ok(n) = cmd.get_feature_report(&mut status) {
            if n > 1 && status[1] == 0x01 {
                granted = true;
                break;
            }
        }
    }
    if !granted {
        return Err("El ratón no responde. Si está suspendido, muévelo para despertarlo; volveremos a conectar automáticamente.".into());
    }

    // 3. Read the actual report using its exact packet length.
    let mut buf = vec![0u8; read_len as usize];
    buf[0] = report_id;
    let n = cmd.get_feature_report(&mut buf).map_err(|e| format!("No se pudo leer el reporte: {e}"))?;
    if n < 3 || buf[0] != report_id || buf[1] != read_len {
        return Err("El ratón devolvió una respuesta incompleta. Vuelve a intentarlo con el ratón despierto.".into());
    }
    buf.truncate(n);
    Ok(buf)
}

fn write_report(cmd: &HidDevice, data: &[u8], last_cmd: &mut Option<Instant>) -> Result<(), String> {
    if data.len() < 3 || data.len() > protocol::FEATURE_LEN || data[1] as usize != data.len() {
        return Err("Paquete HID no válido".into());
    }
    let end = match data[0] {
        protocol::REPORT_DPI => 52,
        protocol::REPORT_LIGHTING => 13,
        protocol::REPORT_POLLING_RATE => 5,
        protocol::REPORT_BUTTON_MAPPING => 59,
        protocol::REPORT_PROFILE_SETTINGS => 6,
        _ => return Err("Reporte sin verificación implementada".into()),
    };
    if data.len() < end { return Err("Paquete HID incompleto".into()); }
    space_commands(last_cmd);
    let padded = protocol::pad(data);
    cmd.send_feature_report(&padded).map_err(|e| format!("No se pudo escribir en el ratón: {e}"))?;
    // Keep SET + GET in the same worker job: no other request may interleave.
    let param = if data[0] == protocol::REPORT_PROFILE_SETTINGS { 0 } else { data[2] };
    let actual = read_report(cmd, data[0], data[1], param, last_cmd)?;
    if actual.len() < end || actual[0] != data[0] || actual[2..end] != data[2..end] {
        return Err(format!("El ratón no confirmó el cambio del reporte {:#04x}. Recarga la configuración o reconecta el enlace activo.", data[0]));
    }
    Ok(())
}

fn read_with_recovery(api: &HidApi, command: &mut HidDevice, path: &CString,
    id: u8, len: u8, param: u8, last: &mut Option<Instant>) -> Result<Vec<u8>,String> {
    match read_report(command,id,len,param,last) {
        Ok(raw) => Ok(raw),
        Err(first) => {
            *command = api.open_path(path).map_err(|_|first)?;
            read_report(command,id,len,param,last)
        }
    }
}

fn warm_cache(api: &HidApi, command: &mut HidDevice, path: &CString,
    last: &mut Option<Instant>, cache: &mut HashMap<(u8,u8),Vec<u8>>) {
    if let Ok(raw) = read_with_recovery(api,command,path,protocol::REPORT_PROFILE_SETTINGS,protocol::PACKET_PROFILE_SETTINGS,0,last) {
        if let Ok(settings) = protocol::parse_profile_settings(&raw) {
            cache.insert((protocol::REPORT_PROFILE_SETTINGS,0),raw);
            for (id,len) in [(protocol::REPORT_DPI,protocol::PACKET_DPI),(protocol::REPORT_LIGHTING,protocol::PACKET_LIGHTING),
                (protocol::REPORT_BUTTON_MAPPING,protocol::PACKET_BUTTON_MAPPING),(protocol::REPORT_POLLING_RATE,protocol::PACKET_POLLING_RATE)] {
                if let Ok(raw) = read_with_recovery(api,command,path,id,len,settings.current,last) { cache.insert((id,settings.current),raw); }
            }
        }
    }
}

#[derive(Default)]
struct NotifyState {
    low: bool,
    full: bool,
}

fn maybe_notify(
    app: &Option<AppHandle>,
    battery: &Battery,
    prefs: &SharedPrefs,
    state: &Arc<Mutex<NotifyState>>,
) {
    let Some(app) = app else { return };
    let p = match prefs.lock() {
        Ok(p) => p.clone(),
        Err(_) => return,
    };
    let mut st = match state.lock() {
        Ok(s) => s,
        Err(_) => return,
    };

    use tauri_plugin_notification::NotificationExt;

    if battery.status == 2 {
        // Fully charged.
        if p.charge_full && !st.full {
            st.full = true;
            st.low = false;
            let _ = app
                .notification()
                .builder()
                .title("Carga completa")
                .body("El Attack Shark X11 ha terminado de cargarse.")
                .show();
        }
        return;
    }

    if battery.charging {
        st.low = false;
        st.full = false;
        return;
    }

    if battery.percentage > p.threshold as i32 {
        st.low = false;
        st.full = false;
        return;
    }

    if p.low_battery && !st.low {
        st.low = true;
        let _ = app
            .notification()
            .builder()
            .title("Batería baja")
            .body(format!(
                "Al Attack Shark X11 le queda un {}% de batería. Conéctalo para cargarlo.",
                battery.percentage
            ))
            .show();
    }
}

fn handle_event(
    app: &Option<AppHandle>,
    battery: &Arc<Mutex<Battery>>,
    prefs: &SharedPrefs,
    notify_state: &Arc<Mutex<NotifyState>>,
    data: &[u8],
) {
    if data.len() < 5 || data[0] != 0x03 {
        return;
    }
    let code = data[2];
    match code {
        0x40 | 0x41 => {
            let mut b = match battery.lock() {
                Ok(b) => b,
                Err(_) => return,
            };
            b.update(data[3], data[4] as i32);
            let snapshot = b.clone();
            drop(b);
            if let Some(app) = app {
                let _ = app.emit("device://battery", snapshot.clone());
                crate::tray::update(app, Some(&snapshot), true);
            }
            maybe_notify(app, &snapshot, prefs, notify_state);
        }
        _ => {
            if let Some(app) = app {
                let _ = app.emit("device://event", data.to_vec());
            }
        }
    }
}

fn worker(
    app: Option<AppHandle>,
    command_path: CString,
    events_path: CString,
    battery: Arc<Mutex<Battery>>,
    prefs: SharedPrefs,
    notify_state: Arc<Mutex<NotifyState>>,
    alive: Arc<AtomicBool>,
    wireless: bool,
    rx: Receiver<Job>,
    init: Sender<Result<(), String>>,
) {
    let api = match HidApi::new() {
        Ok(api) => api,
        Err(e) => {
            let _ = init.send(Err(format!("No se pudo inicializar HID: {e}")));
            return;
        }
    };

    let mut command = match api.open_path(&command_path) {
        Ok(dev) => dev,
        Err(e) => {
            let _ = init.send(Err(format!("No se pudo abrir el ratón: {e}")));
            return;
        }
    };

    let events = api.open_path(&events_path).ok();

    let mut last_cmd: Option<Instant> = None;
    let mut cache: HashMap<(u8,u8),Vec<u8>> = HashMap::new();

    // Validate the link with a harmless version read before reporting success.
    match read_report(&command, REPORT_DEVICE_VERSION, protocol::PACKET_DEVICE_VERSION, 0x01, &mut last_cmd)
    {
        Ok(raw) if raw.len() >= 4 && raw[3] == 0x55 => {
            cache.insert((REPORT_DEVICE_VERSION,1),raw);
            alive.store(true,Ordering::Relaxed);
            let _ = init.send(Ok(()));
        }
        Ok(_) => {
            let _ = init.send(Err("El dispositivo no se identifica como Attack Shark X11".into()));
            return;
        }
        Err(e) => {
            let _ = init.send(Err(e));
            return;
        }
    }

    let mut last_probe = Instant::now();
    loop {
        let mut idle = false;
        match rx.recv_timeout(Duration::from_millis(15)) {
            Ok(Job::Read { report_id, read_len, param, reply }) => {
                let key = (report_id,param);
                let result = if !alive.load(Ordering::Relaxed) { Err("El ratón está apagado o fuera de alcance".into()) }
                    else if let Some(raw) = cache.get(&key) { Ok(raw.clone()) }
                    else { read_with_recovery(&api, &mut command, &command_path, report_id, read_len, param, &mut last_cmd) };
                if let Ok(raw) = &result { cache.insert(key,raw.clone()); }
                let _ = reply.send(result);
            }
            Ok(Job::Write { data, reply }) => {
                let result = write_report(&command, &data, &mut last_cmd);
                let param = if data[0] == protocol::REPORT_PROFILE_SETTINGS {0} else {data[2]};
                if result.is_ok() { cache.insert((data[0],param),data.clone()); }
                else { cache.remove(&(data[0],param)); }
                last_probe = Instant::now();
                let _ = reply.send(result);
            }
            Ok(Job::Stop) => break,
            Err(RecvTimeoutError::Timeout) => { idle = true; }
            Err(RecvTimeoutError::Disconnected) => break,
        }

        if let Some(evt) = &events {
            let mut buf = [0u8; 64];
            if let Ok(n) = evt.read_timeout(&mut buf, 0) {
                if n >= 5 && buf[0] == 3 && buf[1] == 0x55 {
                    if matches!(buf[2],0x40|0x41|0x80|0x10) && !alive.swap(true,Ordering::Relaxed) {
                        cache.clear();
                        if let Ok(reopened) = api.open_path(&command_path) { command=reopened; }
                        warm_cache(&api,&mut command,&command_path,&mut last_cmd,&mut cache);
                        if let Some(app) = &app { let _ = app.emit("device://connection",true); }
                    }
                    if matches!(buf[2],0x40|0x41) { last_probe = Instant::now(); }
                    if buf[2] == 0x80 && buf[3] < 5 {
                        if let Some(raw) = cache.get_mut(&(protocol::REPORT_PROFILE_SETTINGS,0)) {
                            raw[2] = buf[3]+1; raw[3] = !raw[2];
                        }
                    }
                    if buf[2] == 0x10 && (1..=8).contains(&buf[3]) {
                        let p = cache.get(&(protocol::REPORT_PROFILE_SETTINGS,0)).map(|raw|raw[2]).unwrap_or(1);
                        if let Some(raw) = cache.get(&(protocol::REPORT_DPI,p)) {
                            if let Ok(mut cfg) = protocol::DpiConfig::parse(raw) { cfg.current_stage=buf[3]; cache.insert((protocol::REPORT_DPI,p),cfg.build()); }
                        }
                    }
                    handle_event(&app, &battery, &prefs, &notify_state, &buf[..n]);
                }
            }
        }
        // Receiver USB presence doesn't tell us whether the radio mouse is on.
        // Probe only when idle, at a bounded cadence, never on page navigation.
        if wireless && idle && last_probe.elapsed() >= Duration::from_secs(15) {
            last_probe = Instant::now();
            let present = read_report(&command,REPORT_DEVICE_VERSION,protocol::PACKET_DEVICE_VERSION,1,&mut last_cmd)
                .is_ok_and(|raw| raw.len() >= 4 && raw[3] == 0x55);
            if alive.swap(present,Ordering::Relaxed) != present {
                cache.clear();
                if present {
                    if let Ok(reopened) = api.open_path(&command_path) { command=reopened; }
                    warm_cache(&api,&mut command,&command_path,&mut last_cmd,&mut cache);
                }
                if let Some(app) = &app {
                    let _ = app.emit("device://connection",present);
                    crate::tray::update(app,Some(&battery.lock().map(|b|b.clone()).unwrap_or_default()),present);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Connecting
// ---------------------------------------------------------------------------

pub fn connect(app: Option<&AppHandle>, pid: Option<u16>, prefs: SharedPrefs) -> Result<Connection, String> {
    let api = HidApi::new().map_err(|e| format!("No se pudo inicializar HID: {e}"))?;

    let candidates: Vec<u16> = match pid {
        Some(p) => vec![p],
        None => vec![PID_WIRED, PID_WIRELESS],
    };

    let mut last_error = String::from("No se encontró ningún ratón Attack Shark X11");
    for candidate in candidates {
        let Some((command_path, events_path, info)) = find_pair(&api, candidate) else {
            last_error = format!("No se encontró la conexión {} ({})", connection_kind(candidate), pid_label(candidate));
            continue;
        };

        let (tx, rx) = mpsc::channel();
        let (init_tx, init_rx) = mpsc::channel();
        let battery = Arc::new(Mutex::new(Battery::default()));
        let notify_state = Arc::new(Mutex::new(NotifyState::default()));
        let alive = Arc::new(AtomicBool::new(false));

        let app_clone = app.cloned();
        let battery_clone = battery.clone();
        let prefs_clone = prefs.clone();
        let notify_clone = notify_state.clone();
        let alive_clone = alive.clone();
        let join = thread::spawn(move || {
            worker(app_clone, command_path, events_path, battery_clone, prefs_clone, notify_clone, alive_clone, candidate == PID_WIRELESS, rx, init_tx);
        });

        match init_rx.recv_timeout(Duration::from_secs(4)) {
            Ok(Ok(())) => {
                return Ok(Connection {
                    tx,
                    join: Some(join),
                    info: ConnectionInfo {
                        pid: candidate,
                        connection: connection_kind(candidate).to_string(),
                        product: info.product,
                    },
                    battery,
                    alive,
                });
            }
            Ok(Err(e)) => {
                last_error = e;
                let _ = tx.send(Job::Stop);
                let _ = join.join();
            }
            Err(_) => {
                last_error = "Se agotó el tiempo conectando con el dispositivo".to_string();
                let _ = tx.send(Job::Stop);
                let _ = join.join();
            }
        }
    }

    Err(last_error)
}
