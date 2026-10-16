// SPDX-License-Identifier: GPL-3.0-or-later
import type { ReactNode } from "react";
import {
  BatteryIcon,
  ButtonsIcon,
  DashboardIcon,
  KeyboardIcon,
  LightIcon,
  MouseIcon,
  PollIcon,
  ProfilesIcon,
  RefreshIcon,
  SettingsIcon,
  TargetIcon,
} from "./icons";
import { CONNECTION_LABEL } from "../lib/api";
import type { Battery } from "../lib/api";

export type PageId = "dashboard" | "dpi" | "lighting" | "buttons" | "performance" | "profiles" | "settings";

export const NAV: { id: PageId; label: string; icon: ReactNode; title: string; subtitle: string }[] = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: <DashboardIcon />,
    title: "Inicio",
    subtitle: "Estado y energía del dispositivo",
  },
  { id: "dpi", label: "DPI", icon: <TargetIcon />, title: "Sensibilidad (DPI)", subtitle: "Etapas, indicador y ajustes del sensor" },
  { id: "lighting", label: "Iluminación", icon: <LightIcon />, title: "Iluminación", subtitle: "Efectos, color y comportamiento" },
  { id: "buttons", label: "Botones", icon: <ButtonsIcon />, title: "Botones", subtitle: "Asigna acciones a cada botón" },
  { id: "performance", label: "Rendimiento", icon: <PollIcon />, title: "Rendimiento", subtitle: "Tasa de sondeo del sensor" },
  { id: "profiles", label: "Perfiles", icon: <ProfilesIcon />, title: "Perfiles", subtitle: "Configuraciones guardadas en el ratón" },
  { id: "settings", label: "Ajustes", icon: <SettingsIcon />, title: "Ajustes", subtitle: "Información y preferencias" },
];

export function Sidebar({
  current,
  onNavigate,
  connected,
  battery,
  deviceKind,
  connecting,
  onReconnect,
  profile,
  maxProfiles,
  setProfile,
}: {
  current: PageId;
  onNavigate: (id: PageId) => void;
  connected: boolean;
  battery: Battery | null;
  deviceKind: string;
  connecting: boolean;
  onReconnect: () => void;
  profile: number;
  maxProfiles: number;
  setProfile: (n: number) => void;
}) {
  const pct = battery?.known ? battery.percentage : 0;
  const color = !battery?.known
    ? "var(--muted)"
    : battery.charging
      ? "var(--cyan)"
      : pct > 40
        ? "var(--green)"
        : pct > 15
          ? "var(--yellow)"
          : "var(--red)";
  const kindLabel = connected ? (CONNECTION_LABEL[deviceKind] ?? "Conectado") : "Sin conexión";

  return (
    <aside className="sidebar">
      <div className="brand" data-tauri-drag-region>
        <div className="brand-mark">
          <MouseIcon />
        </div>
        <div className="brand-text">
          <b>AS x11</b>
          <span>Mouse Configurator</span>
        </div>
      </div>

      {NAV.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${current === item.id ? "active" : ""}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className="nav-spacer" />

      <div className="device-panel">
        <div className="dp-row">
          <span className="dot" style={{ color: connected ? "var(--green)" : "var(--muted-2)" }} />
          <b>{kindLabel}</b>
        </div>

        <div className="dp-row">
          <BatteryIcon width={15} height={15} style={{ color }} />
          <div className="dp-bar">
            <div
              className="dp-fill"
              style={{
                width: `${battery?.known ? pct : 0}%`,
                background: color,
                boxShadow: battery?.known ? `0 0 10px ${color}` : "none",
              }}
            />
          </div>
          <span className="mono small" style={{ color, minWidth: 34, textAlign: "right" }}>
            {battery?.known ? `${pct}%` : "—"}
          </span>
        </div>

        {connected && maxProfiles > 1 && (
          <label className="dp-profile">
            <span className="muted small">Perfil</span>
            <select value={profile} onChange={(e) => setProfile(Number(e.target.value))}>
              {Array.from({ length: maxProfiles }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        <button className="btn sm" onClick={onReconnect} disabled={connecting}>
          {connecting ? <span className="spinner" /> : <RefreshIcon width={14} height={14} />} Reconectar
        </button>

        <span className="dp-version">
          <KeyboardIcon width={12} height={12} /> AS x11 v0.3.2
        </span>
      </div>
    </aside>
  );
}

