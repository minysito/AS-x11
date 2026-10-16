// SPDX-License-Identifier: GPL-3.0-or-later
//! Google Drive synchronisation: OAuth 2.0 (PKCE + loopback redirect) and a small
//! wrapper around the Drive v3 REST API storing a single JSON backup inside the
//! hidden `appDataFolder`.
//!
//! The user supplies their own OAuth *Client ID* (Google requires every native app
//! to identify itself). Tokens are stored next to the app config, never in the repo.

use base64::engine::general_purpose::{STANDARD_NO_PAD, URL_SAFE_NO_PAD};
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{ErrorKind, Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const DRIVE_FILES: &str = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD: &str = "https://www.googleapis.com/upload/drive/v3/files";
const SCOPE: &str = "https://www.googleapis.com/auth/drive.appdata openid email";
const BACKUP_NAME: &str = "as-x11-config.json";

fn now_secs() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

// --------------------------------------------------------------------------- storage

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct StoredAuth {
    pub client_id: String,
    pub refresh_token: Option<String>,
    pub access_token: Option<String>,
    pub expires_at: i64,
    pub email: Option<String>,
    pub last_sync: Option<i64>,
    pub file_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SyncStatus {
    pub configured: bool,
    pub connected: bool,
    pub client_id: String,
    pub email: Option<String>,
    pub last_sync: Option<i64>,
}

fn auth_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| format!("Sin carpeta de configuración: {e}"))?;
    Ok(dir.join("google-drive.json"))
}

fn load(app: &AppHandle) -> StoredAuth {
    auth_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn store(app: &AppHandle, auth: &StoredAuth) -> Result<(), String> {
    let path = auth_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(auth).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

fn to_status(auth: &StoredAuth) -> SyncStatus {
    SyncStatus {
        configured: !auth.client_id.trim().is_empty(),
        connected: auth.refresh_token.is_some(),
        client_id: auth.client_id.clone(),
        email: auth.email.clone(),
        last_sync: auth.last_sync,
    }
}

pub fn status(app: &AppHandle) -> SyncStatus {
    to_status(&load(app))
}

pub fn set_client_id(app: &AppHandle, client_id: String) -> SyncStatus {
    let mut auth = load(app);
    auth.client_id = client_id.trim().to_string();
    // Changing the client invalidates any previous session.
    auth.refresh_token = None;
    auth.access_token = None;
    auth.email = None;
    let _ = store(app, &auth);
    to_status(&auth)
}

pub fn disconnect(app: &AppHandle) -> SyncStatus {
    let mut auth = load(app);
    auth.refresh_token = None;
    auth.access_token = None;
    auth.expires_at = 0;
    auth.email = None;
    let _ = store(app, &auth);
    to_status(&auth)
}

// --------------------------------------------------------------------------- helpers

fn http_err(e: ureq::Error) -> String {
    match e {
        ureq::Error::Status(code, resp) => {
            let body = resp.into_string().unwrap_or_default();
            let short = body.chars().take(300).collect::<String>();
            format!("Google respondió {code}: {short}")
        }
        ureq::Error::Transport(t) => format!("Error de red: {t}"),
    }
}

fn b64url(data: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(data)
}

fn random_verifier() -> String {
    let mut bytes = [0u8; 48];
    rand::thread_rng().fill_bytes(&mut bytes);
    b64url(&bytes)
}

fn decode_jwt_email(id_token: &str) -> Option<String> {
    let payload = id_token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD.decode(payload).or_else(|_| STANDARD_NO_PAD.decode(payload)).ok()?;
    let json: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    json.get("email").and_then(|v| v.as_str()).map(|s| s.to_string())
}

fn query_param(path: &str, key: &str) -> Option<String> {
    let query = path.split_once('?')?.1;
    for pair in query.split('&') {
        let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
        if k == key {
            return Some(urlencoding::decode(v).map(|c| c.into_owned()).unwrap_or_else(|_| v.to_string()));
        }
    }
    None
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    #[serde(default)]
    expires_in: i64,
    #[serde(default)]
    refresh_token: Option<String>,
    #[serde(default)]
    id_token: Option<String>,
}

/// Return a valid access token, refreshing it when necessary.
fn bearer(app: &AppHandle, auth: &mut StoredAuth) -> Result<String, String> {
    if auth.client_id.trim().is_empty() {
        return Err("Configura primero tu Client ID de Google".into());
    }
    if let Some(token) = &auth.access_token {
        if auth.expires_at > now_secs() + 60 {
            return Ok(token.clone());
        }
    }

    let refresh = auth.refresh_token.clone().ok_or("No has iniciado sesión en Google")?;
    let response: TokenResponse = ureq::post(TOKEN_URL)
        .send_form(&[
            ("client_id", auth.client_id.as_str()),
            ("refresh_token", refresh.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .map_err(http_err)?
        .into_json()
        .map_err(|e| format!("Respuesta inesperada al renovar la sesión: {e}"))?;

    auth.access_token = Some(response.access_token.clone());
    auth.expires_at = now_secs() + response.expires_in.max(60);
    let _ = store(app, auth);
    Ok(response.access_token)
}

// --------------------------------------------------------------------------- OAuth

fn wait_for_code(listener: TcpListener, timeout: Duration) -> Result<String, String> {
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let deadline = Instant::now() + timeout;

    while Instant::now() < deadline {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buf = [0u8; 8192];
                let n = stream.read(&mut buf).unwrap_or(0);
                let request = String::from_utf8_lossy(&buf[..n]).to_string();
                let path = request
                    .lines()
                    .next()
                    .and_then(|line| line.split_whitespace().nth(1))
                    .unwrap_or("")
                    .to_string();

                let code = query_param(&path, "code");
                let error = query_param(&path, "error");

                if code.is_none() && error.is_none() {
                    // Favicon or other stray request: answer 404 and keep waiting.
                    let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                    continue;
                }

                let (title, message) = if code.is_some() {
                    ("¡Conectado!", "Ya puedes cerrar esta pestaña y volver a AS x11.")
                } else {
                    ("No se pudo autorizar", "Puedes cerrar esta pestaña e intentarlo de nuevo.")
                };
                let body = format!(
                    "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>{title}</title>\
                     <style>body{{margin:0;height:100vh;display:grid;place-items:center;background:#0b0d12;\
                     color:#eef1f7;font-family:Segoe UI,system-ui,sans-serif}}div{{text-align:center}}\
                     h1{{font-size:22px;margin:0 0 8px}}p{{color:#8b93a7;margin:0}}</style></head>\
                     <body><div><h1>{title}</h1><p>{message}</p></div></body></html>"
                );
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();

                if let Some(code) = code {
                    return Ok(code);
                }
                return Err(format!("Google rechazó la autorización: {}", error.unwrap_or_default()));
            }
            Err(ref e) if e.kind() == ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(150));
            }
            Err(e) => return Err(format!("Error en el servidor local: {e}")),
        }
    }

    Err("Se agotó el tiempo esperando la autorización de Google".into())
}

/// Blocking OAuth flow. Run this off the UI thread.
pub fn connect(app: &AppHandle) -> Result<SyncStatus, String> {
    let mut auth = load(app);
    if auth.client_id.trim().is_empty() {
        return Err("Configura primero tu Client ID de Google en Ajustes".into());
    }

    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| format!("No se pudo abrir el puerto local: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect = format!("http://127.0.0.1:{port}");

    let verifier = random_verifier();
    let challenge = b64url(&Sha256::digest(verifier.as_bytes()));

    let url = format!(
        "{AUTH_URL}?client_id={}&redirect_uri={}&response_type=code&scope={}&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
        urlencoding::encode(&auth.client_id),
        urlencoding::encode(&redirect),
        urlencoding::encode(SCOPE),
        challenge,
    );

    open::that(&url).map_err(|e| format!("No se pudo abrir el navegador: {e}"))?;

    let code = wait_for_code(listener, Duration::from_secs(240))?;

    let response: TokenResponse = ureq::post(TOKEN_URL)
        .send_form(&[
            ("client_id", auth.client_id.as_str()),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect.as_str()),
        ])
        .map_err(http_err)?
        .into_json()
        .map_err(|e| format!("Respuesta inesperada de Google: {e}"))?;

    auth.access_token = Some(response.access_token.clone());
    auth.expires_at = now_secs() + response.expires_in.max(60);
    if response.refresh_token.is_some() {
        auth.refresh_token = response.refresh_token;
    }
    if let Some(email) = response.id_token.as_deref().and_then(decode_jwt_email) {
        auth.email = Some(email);
    }
    store(app, &auth)?;
    Ok(to_status(&auth))
}

// --------------------------------------------------------------------------- Drive

#[derive(Deserialize)]
struct DriveFile {
    id: String,
}

#[derive(Deserialize)]
struct DriveList {
    #[serde(default)]
    files: Vec<DriveFile>,
}

fn find_backup(token: &str) -> Result<Option<DriveFile>, String> {
    let query = format!("name='{BACKUP_NAME}' and 'appDataFolder' in parents and trashed=false");
    let url = format!(
        "{DRIVE_FILES}?spaces=appDataFolder&fields=files(id)&q={}",
        urlencoding::encode(&query)
    );
    let list: DriveList = ureq::get(&url)
        .set("Authorization", &format!("Bearer {token}"))
        .call()
        .map_err(http_err)?
        .into_json()
        .map_err(|e| format!("Respuesta inesperada de Drive: {e}"))?;
    Ok(list.files.into_iter().next())
}

/// Blocking upload of the backup JSON. Run this off the UI thread.
pub fn upload(app: &AppHandle, content: &str) -> Result<SyncStatus, String> {
    let mut auth = load(app);
    let token = bearer(app, &mut auth)?;

    let existing = find_backup(&token)?;

    if let Some(file) = existing {
        let url = format!("{DRIVE_UPLOAD}/{}?uploadType=media", file.id);
        ureq::request("PATCH", &url)
            .set("Authorization", &format!("Bearer {token}"))
            .set("Content-Type", "application/json; charset=utf-8")
            .send_string(content)
            .map_err(http_err)?;
        auth.file_id = Some(file.id);
    } else {
        let boundary = "openshark_drive_boundary";
        let metadata = serde_json::json!({ "name": BACKUP_NAME, "parents": ["appDataFolder"] });
        let body = format!(
            "--{b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n--{b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{content}\r\n--{b}--\r\n",
            b = boundary,
            meta = metadata,
            content = content,
        );
        let url = format!("{DRIVE_UPLOAD}?uploadType=multipart&fields=id");
        let created: DriveFile = ureq::post(&url)
            .set("Authorization", &format!("Bearer {token}"))
            .set("Content-Type", &format!("multipart/related; boundary={boundary}"))
            .send_string(&body)
            .map_err(http_err)?
            .into_json()
            .map_err(|e| format!("Respuesta inesperada de Drive: {e}"))?;
        auth.file_id = Some(created.id);
    }

    auth.last_sync = Some(now_secs());
    store(app, &auth)?;
    Ok(to_status(&auth))
}

/// Blocking download of the backup JSON. Returns the raw JSON string.
pub fn download(app: &AppHandle) -> Result<String, String> {
    let mut auth = load(app);
    let token = bearer(app, &mut auth)?;

    let file = find_backup(&token)?.ok_or("No hay ninguna copia guardada en tu Google Drive")?;
    let url = format!("{DRIVE_FILES}/{}?alt=media", file.id);
    let body = ureq::get(&url)
        .set("Authorization", &format!("Bearer {token}"))
        .call()
        .map_err(http_err)?
        .into_string()
        .map_err(|e| format!("No se pudo leer la copia: {e}"))?;

    auth.last_sync = Some(now_secs());
    auth.file_id = Some(file.id);
    store(app, &auth)?;
    Ok(body)
}
