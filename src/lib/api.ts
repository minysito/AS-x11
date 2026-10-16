// SPDX-License-Identifier: GPL-3.0-or-later
import { invoke } from "@tauri-apps/api/core";
import { pendingValue } from "./settingsQueue";

// ---------------------------------------------------------------------------
// Types mirrored from the Rust backend
// ---------------------------------------------------------------------------

export interface DeviceInfo {
  path: string;
  product: string;
  pid: number;
  connection: string;
  interface: number;
  usage_page: number;
  usage: number;
}

export interface ConnectionInfo {
  pid: number;
  connection: string;
  product: string;
}

export interface Battery {
  known: boolean;
  status: number;
  percentage: number;
  charging: boolean;
}

export interface DeviceVersion {
  device_id: number;
  raw: number[];
}

export interface Status {
  connected: boolean;
  device: ConnectionInfo | null;
  battery: Battery | null;
  version: DeviceVersion | null;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface DpiConfig {
  profile_id: number;
  lift_off_distance: number;
  motion_sync: boolean;
  angle_snap: boolean;
  ripple_control: boolean;
  active_stages: number;
  current_stage: number;
  values: number[];
  colors: Rgb[];
  indicator: number;
}

export interface LightingConfig {
  profile_id: number;
  mode: number;
  color: Rgb;
  speed: number;
  sleep_time: number;
  deep_sleep: number;
  key_response: number;
  brightness: number;
}

export interface ButtonSlot {
  action: number;
  modifiers: number;
  usage: number;
}

export interface ButtonConfig {
  profile_id: number;
  slots: ButtonSlot[];
}

export interface ProfileSettings {
  current: number;
  max: number;
}

export interface NotifyPrefs {
  low_battery: boolean;
  threshold: number;
  charge_full: boolean;
}

export interface SyncStatus {
  configured: boolean;
  connected: boolean;
  client_id: string;
  email: string | null;
  last_sync: number | null;
}

export interface BackupProfile {
  profile_id: number;
  dpi: DpiConfig;
  lighting: LightingConfig;
  buttons: ButtonConfig;
  polling: number;
}

export interface Backup {
  format: string;
  version: number;
  created_at: number;
  product: string | null;
  profiles: BackupProfile[];
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export const api = {
  listDevices: () => invoke<DeviceInfo[]>("list_devices"),
  connect: (pid?: number) => invoke<Status>("connect", { pid: pid ?? null }),
  getAutostart: () => invoke<boolean>("get_autostart"),
  setAutostart: (enabled: boolean) => invoke<void>("set_autostart", { enabled }),
  status: () => invoke<Status>("status"),

  getDpi: (profileId: number) => Promise.resolve(pendingValue<DpiConfig>(`dpi:${profileId}`) ?? invoke<DpiConfig>("get_dpi", { profileId })),
  setDpi: (config: DpiConfig) => invoke<void>("set_dpi", { config }),

  getLighting: (profileId: number) => Promise.resolve(pendingValue<LightingConfig>(`lighting:${profileId}`) ?? invoke<LightingConfig>("get_lighting", { profileId })),
  setLighting: (config: LightingConfig) => invoke<void>("set_lighting", { config }),

  getPolling: (profileId: number) => Promise.resolve(pendingValue<number>(`polling:${profileId}`) ?? invoke<number>("get_polling", { profileId })),
  setPolling: (profileId: number, rate: number) => invoke<void>("set_polling", { profileId, rate }),

  getButtons: (profileId: number) => Promise.resolve(pendingValue<ButtonConfig>(`buttons:${profileId}`) ?? invoke<ButtonConfig>("get_buttons", { profileId })),
  setButtons: (config: ButtonConfig) => invoke<void>("set_buttons", { config }),

  getProfileSettings: () => invoke<ProfileSettings>("get_profile_settings"),
  setProfileSettings: (current: number, max: number) =>
    invoke<void>("set_profile_settings", { current, max }),

  exportConfig: () => invoke<Backup>("export_config"),
  importConfig: (backup: Backup) => invoke<void>("import_config", { backup }),

  getNotifyPrefs: () => invoke<NotifyPrefs>("get_notify_prefs"),
  setNotifyPrefs: (prefs: NotifyPrefs) => invoke<void>("set_notify_prefs", { prefs }),
  testNotification: () => invoke<void>("test_notification"),

  syncStatus: () => invoke<SyncStatus>("sync_status"),
  syncSetClientId: (clientId: string) => invoke<SyncStatus>("sync_set_client_id", { clientId }),
  syncConnect: () => invoke<SyncStatus>("sync_connect"),
  syncDisconnect: () => invoke<SyncStatus>("sync_disconnect"),
  syncUpload: () => invoke<SyncStatus>("sync_upload"),
  syncDownload: () => invoke<SyncStatus>("sync_download"),
};

// ---------------------------------------------------------------------------
// Human readable helpers
// ---------------------------------------------------------------------------

export const CONNECTION_LABEL: Record<string, string> = {
  wired: "Cable USB",
  wireless: "Inalámbrico 2.4 GHz",
  r1: "Receptor R1",
  unknown: "Desconocido",
};

export function formatHex(value: number, pad = 2): string {
  return "0x" + value.toString(16).toUpperCase().padStart(pad, "0");
}

