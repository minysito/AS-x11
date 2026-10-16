// SPDX-License-Identifier: GPL-3.0-or-later
import { useAutoApply } from "../lib/autoApply";
import { LoadError } from "../components/LoadError";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { DpiConfig, Rgb } from "../lib/api";
import { useDevice } from "../lib/device";
import { Card, ColorField, Segmented, SettingRow, Slider, Spinner, Switch, rgbToHex } from "../components/ui";
import { LiftIcon, TargetIcon } from "../components/icons";
import { useToast } from "../lib/toast";
import { NotConnected } from "../components/NotConnected";

const LIFT_OPTIONS = [
  { value: 0, label: "Bajo" },
  { value: 1, label: "Medio" },
  { value: 2, label: "Alto" },
];

export function DpiPage() {
  const { status, profile } = useDevice();
  const toast = useToast();
  const [config, setConfig] = useState<DpiConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { apply, saving } = useAutoApply<DpiConfig>(`dpi:${profile}`, api.setDpi);

  const load = useCallback(async () => {
    if (!status?.connected) return;
    setLoading(true);
    setLoadError(null);
    try {
      const c = await api.getDpi(profile);
      setConfig(c);

    } catch (e) {
      setLoadError(String(e));
      toast.err(String(e));
    } finally {
      setLoading(false);
    }
  }, [profile, status?.connected, status?.device?.pid, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(next: Partial<DpiConfig>) {
    if (!config) return;
    const updated = { ...config, ...next };
    setConfig(updated);
    apply(updated);
  }

  function setStageDpi(index: number, value: number) {
    if (!config) return;
    const values = [...config.values];
    const clamped = Math.max(50, Math.min(22000, value));
    const step = clamped <= 5000 ? 50 : clamped <= 10000 ? 100 : 200;
    values[index] = clamped === 20100 ? 20100 : Math.round(clamped / step) * step;
    patch({ values });
  }

  function setStageColor(index: number, color: Rgb) {
    if (!config) return;
    const colors = [...config.colors];
    colors[index] = color;
    patch({ colors });
  }

  function toggleStage(index: number) {
    if (!config) return;
    const next = config.active_stages ^ (1 << index);
    if (!next) { toast.err("Mantén al menos una etapa de DPI activa"); return; }
    const values = [...config.values];
    if (values[index] === 0) values[index] = 800;
    const current = next & (1 << (config.current_stage - 1))
      ? config.current_stage : Array.from({ length: 8 }, (_, i) => i).find(i => next & (1 << i))! + 1;
    patch({ active_stages: next, current_stage: current, values });
  }

  if (!status?.connected) return <NotConnected />;
  if (loadError) return <LoadError message={loadError} retry={load} />;

  if (!config) {
    return (
      <div className="page">
        <Card>
          <div className="center-box">
            <Spinner />
            <span>Cargando configuración de DPI…</span>
          </div>
        </Card>
      </div>
    );
  }

  const activeCount = countBits(config.active_stages);

  return (
    <div className="page grid" style={{ gap: 18 }} inert={loading}>
      <Card
        icon={<TargetIcon />}
        title="Etapas de DPI"
        desc={`${activeCount} de 8 etapas activas · Perfil ${profile}`}
        actions={<span className="apply-status" role="status">{saving ? "Aplicando…" : "Cambios automáticos"}</span>}
      >
        <div className="stage-list">
          {config.values.map((value, i) => {
            const active = (config.active_stages & (1 << i)) !== 0;
            const current = config.current_stage === i + 1;
            return (
              <div key={i} className={`stage ${active ? "active" : ""} ${current ? "current" : ""}`}>
                <span className="idx">{i + 1}</span>
                <Switch checked={active} onChange={() => toggleStage(i)} />
                <div className="dpi-value">
                  <input
                    type="number"
                    min={50}
                    max={22000}
                    step={50}
                    value={value}
                    disabled={!active}
                    onChange={(e) => setStageDpi(i, Number(e.target.value))}
                  />
                  <span className="muted small">DPI</span>
                </div>
                <div className="dpi-slider">
                  <Slider
                    min={50}
                    max={22000}
                    step={50}
                    value={value}
                    onChange={(v) => setStageDpi(i, v)}
                  />
                </div>
                <input
                  type="color"
                  value={rgbToHex(config.colors[i])}
                  disabled={!active}
                  onChange={(e) => {
                    const h = e.target.value.replace("#", "");
                    setStageColor(i, {
                      r: parseInt(h.slice(0, 2), 16),
                      g: parseInt(h.slice(2, 4), 16),
                      b: parseInt(h.slice(4, 6), 16),
                    });
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: "1px solid var(--border-strong)",
                    background: "transparent",
                    padding: 2,
                  }}
                  title="Color del indicador de esta etapa"
                />
                <button
                  type="button"
                  className={`btn sm ${current ? "primary" : "ghost"}`}
                  disabled={!active}
                  onClick={() => patch({ current_stage: i + 1 })}
                >
                  {current ? "Actual" : "Usar"}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid two">
        <Card icon={<LiftIcon />} title="Sensor" desc="Ajustes avanzados del sensor PixArt PAW3311">
          <SettingRow label="Altura de despegue (LOD)" hint="Distancia a la que el sensor deja de rastrear">
            <Segmented
              options={LIFT_OPTIONS}
              value={config.lift_off_distance}
              onChange={(v) => patch({ lift_off_distance: v })}
            />
          </SettingRow>

          <SettingRow label="Motion Sync" hint="Sincroniza el sensor con la frecuencia de sondeo">
            <Switch checked={config.motion_sync} onChange={(v) => patch({ motion_sync: v })} />
          </SettingRow>

          <SettingRow label="Angle Snap" hint="Corrige automáticamente los trazos rectos">
            <Switch checked={config.angle_snap} onChange={(v) => patch({ angle_snap: v })} />
          </SettingRow>

          <SettingRow label="Ripple Control" hint="Reduce el cabeceo en valores de DPI altos">
            <Switch checked={config.ripple_control} onChange={(v) => patch({ ripple_control: v })} />
          </SettingRow>
        </Card>

        <Card title="Indicador de DPI" desc="Color de cada etapa mostrado en el LED del ratón">
          <div className="grid" style={{ gap: 14 }}>
            {config.colors.map((c, i) =>
              (config.active_stages & (1 << i)) !== 0 ? (
                <div className="row" key={i} style={{ justifyContent: "space-between" }}>
                  <span className="small muted">Etapa {i + 1}</span>
                  <ColorField value={c} onChange={(v) => setStageColor(i, v)} />
                </div>
              ) : null,
            )}
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

