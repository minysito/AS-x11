// SPDX-License-Identifier: GPL-3.0-or-later
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useDevice } from "../lib/device";
import { Badge, Card } from "../components/ui";
import { CheckIcon, PlusIcon, ProfilesIcon, RefreshIcon, XIcon } from "../components/icons";
import { useToast } from "../lib/toast";
import { NotConnected } from "../components/NotConnected";

const MAX_ALLOWED = 5;

export function ProfilesPage() {
  const { status, profile, maxProfiles, reloadProfiles } = useDevice();
  const toast = useToast();
  const [max, setMax] = useState(maxProfiles);
  const [current, setCurrent] = useState(profile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMax(maxProfiles);
    setCurrent(profile);
  }, [maxProfiles, profile]);

  const load = useCallback(async () => {
    if (!status?.connected) return;
    try {
      const ps = await api.getProfileSettings();
      setMax(Math.max(1, ps.max));
      setCurrent(ps.current);
      await reloadProfiles();
    } catch (e) {
      toast.err(String(e));
    }
  }, [status?.connected, toast, reloadProfiles]);

  useEffect(() => {
    load();
  }, [load]);

  async function persist(nextCurrent: number, nextMax: number) {
    setSaving(true);
    try {
      await api.setProfileSettings(nextCurrent, nextMax);
      setCurrent(nextCurrent);
      setMax(nextMax);
      await reloadProfiles();
      toast.ok("Perfiles actualizados");
    } catch (e) {
      toast.err(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!status?.connected) return <NotConnected />;

  const profiles = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="page grid" style={{ gap: 18 }}>
      <Card
        icon={<ProfilesIcon />}
        title="Perfiles del ratón"
        desc="Cada perfil guarda su propio DPI, iluminación, botones y tasa de sondeo"
        actions={
          <div className="row">
            <button className="btn ghost icon" onClick={load} disabled={saving} title="Recargar">
              {saving ? <span className="spinner" /> : <RefreshIcon />}
            </button>
            {max < MAX_ALLOWED && (
              <button
                className="btn"
                disabled={saving}
                onClick={() => persist(current, max + 1)}
                title="Añadir perfil"
              >
                <PlusIcon width={15} height={15} /> Añadir
              </button>
            )}
          </div>
        }
      >
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {profiles.map((n) => {
            const active = current === n;
            return (
              <button
                key={n}
                className={`profile-card ${active ? "active" : ""}`}
                style={{ textAlign: "left", cursor: "pointer" }}
                onClick={() => persist(n, max)}
                disabled={saving}
              >
                <div className="pnum">{n}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Perfil {n}</div>
                  <div className="small muted">
                    {active ? "En uso ahora" : "Pulsa para activar"}
                  </div>
                </div>
                {active ? (
                  <Badge tone="on">
                    <CheckIcon width={13} height={13} /> Activo
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </div>

        {max > 1 && (
          <div style={{ marginTop: 18 }}>
            <button
              className="btn danger sm"
              disabled={saving || current === max}
              onClick={() => persist(Math.min(current, max - 1), max - 1)}
            >
              <XIcon width={14} height={14} /> Eliminar último perfil
            </button>
          </div>
        )}
      </Card>

      <Card title="Cómo funcionan los perfiles" desc="Igual que en el software original">
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Los perfiles se almacenan en la memoria interna del ratón.</li>
          <li>Puedes asignar un botón con la acción <b>Cambiar perfil</b> para alternarlos sin abrir la app.</li>
          <li>Actualmente el firmware del X11 admite hasta {MAX_ALLOWED} perfiles.</li>
        </ul>
      </Card>
    </div>
  );
}
