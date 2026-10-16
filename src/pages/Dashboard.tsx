// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from "react";
import { api, CONNECTION_LABEL } from "../lib/api";
import type { DpiConfig } from "../lib/api";
import { useDevice } from "../lib/device";
import { Badge, BatteryRing, Card, StatTile } from "../components/ui";
import {
  BatteryIcon,
  MouseIcon,
  PollIcon,
  RefreshIcon,
  TargetIcon,
} from "../components/icons";
import { useToast } from "../lib/toast";

export function DashboardPage() {
  const { status, battery, profile, maxProfiles, connect, connecting, devices, refreshDevices } =
    useDevice();
  const toast = useToast();
  const [dpi, setDpi] = useState<DpiConfig | null>(null);
  const [polling, setPolling] = useState<number | null>(null);

  const connected = status?.connected ?? false;

  useEffect(() => {
    if (!connected) {
      setDpi(null);
      setPolling(null);
      return;
    }
    let alive = true;
    Promise.allSettled([api.getDpi(profile), api.getPolling(profile)]).then(([d, p]) => {
      if (!alive) return;
      if (d.status === "fulfilled") setDpi(d.value);
      if (p.status === "fulfilled") setPolling(p.value);
    });
    return () => {
      alive = false;
    };
  }, [connected, profile]);

  const currentDpi =
    dpi && dpi.current_stage >= 1 && dpi.current_stage <= dpi.values.length
      ? dpi.values[dpi.current_stage - 1]
      : dpi?.values?.[0];

  const activeCount = dpi ? countBits(dpi.active_stages) : 0;
  async function handleReconnect() {
    try {
      await refreshDevices();
      if (await connect()) toast.ok("Ratón reconectado");
    } catch (e) {
      toast.err(String(e));
    }
  }

  if (!connected) {
    return (
      <div className="page">
        <Card>
          <div className="center-box">
            <div className="empty-icon">
              <MouseIcon />
            </div>
            <h2>No hay ningún ratón conectado</h2>
            <p className="muted small" style={{ maxWidth: 420 }}>
              Conecta tu Attack Shark X11 por cable USB o mediante el receptor inalámbrico de 2.4 GHz.
              Detectaremos la conexión activa automáticamente.
            </p>
            <div className="row">
              <button className="btn primary" onClick={handleReconnect} disabled={connecting}>
                {connecting ? <span className="spinner" /> : <RefreshIcon width={16} height={16} />}
                Buscar dispositivo
              </button>
            </div>
            {devices.length > 0 && (
              <div className="muted small">
                {devices.length} interfaz{devices.length > 1 ? "es" : ""} detectada
                {devices.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page grid" style={{ gap: 18 }}>
      <div className="device-banner">
        <div className="device-visual">
          <MouseIcon />
          <div className="led" />
        </div>
        <div className="device-info">
          <h2>{status?.device?.product ?? "Attack Shark X11"}</h2>
          <div className="row" style={{ gap: 8 }}>
            <Badge tone="on">
              <span className="dot" /> Conectado
            </Badge>
            <Badge tone="accent">{CONNECTION_LABEL[status?.device?.connection ?? ""] ?? "—"}</Badge>
          </div>
          <div className="meta">
            <span>
              <TargetIcon width={14} height={14} /> {currentDpi ?? "—"} DPI actual
            </span>
            <span>
              <PollIcon width={14} height={14} /> {polling ?? "—"} Hz
            </span>
          </div>
        </div>
        <BatteryRing battery={battery} />
      </div>

      <div className="grid three">
        <StatTile k="Perfil activo" v={profile} unit={`/ ${Math.max(1, maxProfiles)}`} />
        <StatTile k="Etapas de DPI" v={activeCount || "—"} unit="activas" />
        <StatTile k="Modo de conexión" v={CONNECTION_LABEL[status?.device?.connection ?? ""] ?? "—"} />
      </div>

      <div className="grid">
        <Card
          icon={<BatteryIcon />}
          title="Energía"
          desc={battery?.known ? "Lectura en tiempo real" : "Esperando telemetría del dispositivo…"}
          actions={
            <button className="btn icon ghost" onClick={handleReconnect} title="Reconectar">
              <RefreshIcon />
            </button>
          }
        >
          <div className="row" style={{ gap: 24 }}>
            <BatteryRing battery={battery} />
            <div className="grid" style={{ gap: 12, flex: 1 }}>
              <StatTile
                k="Estado"
                v={
                  !battery?.known
                    ? "Sin datos"
                    : battery.status === 3
                      ? "Cargando"
                      : battery.status === 2
                        ? "Completa"
                        : battery.charging
                          ? "En carga"
                          : "Descargando"
                }
              />
              <StatTile k="Nivel" v={battery?.known ? battery.percentage : "—"} unit="%" />
            </div>
          </div>
        </Card>


      </div>
    </div>
  );
}

function countBits(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}
