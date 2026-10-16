// SPDX-License-Identifier: GPL-3.0-or-later
import { useAutoApply } from "../lib/autoApply";
import { MouseVisual } from "../components/MouseVisual";
import { LoadError } from "../components/LoadError";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "../lib/api";
import type { LightingConfig } from "../lib/api";
import { useDevice } from "../lib/device";
import { Card, ColorField, SettingRow, Slider, Spinner } from "../components/ui";
import { LightIcon, SunIcon } from "../components/icons";
import { useToast } from "../lib/toast";
import { NotConnected } from "../components/NotConnected";

const MODES = [
  { value: 0, label: "Apagado" },
  { value: 1, label: "Fijo" },
  { value: 2, label: "Respiración" },
  { value: 3, label: "Neón" },
  { value: 4, label: "Respiración de color" },
  { value: 5, label: "Color por DPI" },
  { value: 6, label: "Respiración por DPI" },
];

const COLOR_MODES = new Set([1, 2]);

export function LightingPage() {
  const { status, profile } = useDevice();
  const toast = useToast();
  const [config, setConfig] = useState<LightingConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { apply, saving } = useAutoApply<LightingConfig>(`lighting:${profile}`, api.setLighting);

  const load = useCallback(async () => {
    if (!status?.connected) return;
    setLoading(true);
    setLoadError(null);
    try {
      setConfig(await api.getLighting(profile));

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

  function patch(next: Partial<LightingConfig>) {
    if (!config) return;
    const updated = { ...config, ...next };
    setConfig(updated);
    apply(updated);
  }

  if (!status?.connected) return <NotConnected />;
  if (loadError) return <LoadError message={loadError} retry={load} />;

  if (!config) {
    return (
      <div className="page">
        <Card>
          <div className="center-box">
            <Spinner />
            <span>Cargando iluminación…</span>
          </div>
        </Card>
      </div>
    );
  }

  const colorEnabled = COLOR_MODES.has(config.mode);

  return (
    <div className="page grid" style={{ gap: 18 }} inert={loading}>
      <details className="lighting-visual"><summary>Vista del LED en tu X11</summary><MouseVisual color={config.color} mode={config.mode} brightness={config.brightness} speed={config.speed}/></details>
      <Card
        icon={<LightIcon />}
        title="Efecto de iluminación"
        desc={`Perfil ${profile}`}
        actions={<span className="apply-status" role="status">{saving ? "Aplicando…" : "Cambios automáticos"}</span>}
      >
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {MODES.map((m) => {
            const active = config.mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                className="action-option"
                style={{
                  borderColor: active ? "var(--accent)" : undefined,
                  background: active ? "rgba(0,240,255,0.10)" : undefined,
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 14,
                }}
                onClick={() => patch({ mode: m.value })}
              >
                <ModePreview mode={m.value} color={config.color} />
                <span style={{ fontWeight: active ? 640 : 520 }}>{m.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid two">
        <Card icon={<SunIcon />} title="Color y brillo" desc="Ajusta el color principal del LED">
          <SettingRow label="Color" hint={colorEnabled ? "Color base del efecto" : "No aplicable a este efecto"}>
            <ColorField value={config.color} onChange={(v) => patch({ color: v })} disabled={!colorEnabled} />
          </SettingRow>

          <SettingRow label="Brillo" hint={`Nivel ${config.brightness} de 8`}>
            <div style={{ width: 200 }}>
              <Slider min={1} max={8} value={config.brightness} onChange={(v) => patch({ brightness: v })} />
            </div>
          </SettingRow>

          <SettingRow label="Velocidad" hint={`Nivel ${config.speed} de 5`}>
            <div style={{ width: 200 }}>
              <Slider min={1} max={5} value={config.speed} onChange={(v) => patch({ speed: v })} />
            </div>
          </SettingRow>
        </Card>

        <Card title="Comportamiento" desc="Gestión de energía y respuesta">
          <SettingRow label="Apagado automático" hint={`${config.sleep_time} min sin uso`}>
            <div style={{ width: 200 }}>
              <Slider
                min={0.5}
                max={30}
                step={0.5}
                value={config.sleep_time}
                onChange={(v) => patch({ sleep_time: v })}
              />
            </div>
          </SettingRow>

          <SettingRow label="Suspensión profunda" hint={`${config.deep_sleep} minutos`}>
            <div style={{ width: 200 }}>
              <Slider min={1} max={60} value={config.deep_sleep} onChange={(v) => patch({ deep_sleep: v })} />
            </div>
          </SettingRow>

          <SettingRow label="Respuesta de teclas" hint={`${config.key_response} ms`}>
            <div style={{ width: 200 }}>
              <Slider
                min={4}
                max={50}
                step={2}
                value={config.key_response}
                onChange={(v) => patch({ key_response: v })}
              />
            </div>
          </SettingRow>
        </Card>
      </div>
    </div>
  );
}

function ModePreview({ mode, color }: { mode: number; color: { r: number; g: number; b: number } }) {
  const rgb = `rgb(${color.r},${color.g},${color.b})`;
  const style: CSSProperties = {
    width: "100%",
    height: 40,
    borderRadius: 10,
    border: "1px solid var(--border)",
  };
  if (mode === 0) {
    style.background = "repeating-linear-gradient(45deg, #1b1f29, #1b1f29 6px, #15181f 6px, #15181f 12px)";
  } else if (mode === 1 || mode === 5) {
    style.background = mode === 1 ? rgb : "conic-gradient(from 90deg, #ff4d2e, #ffc14d, #35d07f, #35d0ff, #a06bff, #ff4d2e)";
  } else if (mode === 3) {
    style.background = "linear-gradient(90deg,#ff4d2e,#ffc14d,#35d07f,#35d0ff,#a06bff)";
  } else {
    style.background = `radial-gradient(circle at 50% 50%, ${rgb}, rgba(0,0,0,0.15))`;
  }
  return <div style={style} />;
}
