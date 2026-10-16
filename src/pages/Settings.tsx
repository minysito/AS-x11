// SPDX-License-Identifier: GPL-3.0-or-later
import { useCallback, useEffect, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api, CONNECTION_LABEL } from "../lib/api";
import type { NotifyPrefs, SyncStatus } from "../lib/api";
import { useDevice } from "../lib/device";
import { Badge, Card, SettingRow, Slider, Switch } from "../components/ui";
import {
  BellIcon,
  CloudIcon,
  DownloadIcon,
  InfoIcon,
  LinkIcon,
  MouseIcon,
  UploadIcon,
  ZapIcon,
} from "../components/icons";
import { useToast } from "../lib/toast";

export function SettingsPage() {
  const { status, notify, setNotify, reloadProfiles } = useDevice();
  const toast = useToast();

  const connected = status?.connected ?? false;
  // ------------------------------------------------------------------ notifications
  const n: NotifyPrefs = notify ?? { low_battery: true, threshold: 20, charge_full: true };
  const [threshold, setThreshold] = useState(n.threshold);
  const thresholdTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (notify) setThreshold(notify.threshold);
  }, [notify?.threshold]);

  const saveNotify = useCallback(
    async (p: NotifyPrefs) => {
      try {
        await setNotify(p);
      } catch (e) {
        toast.err(String(e));
      }
    },
    [setNotify, toast],
  );

  function onThreshold(v: number) {
    setThreshold(v);
    if (!notify) return;
    window.clearTimeout(thresholdTimer.current);
    thresholdTimer.current = window.setTimeout(() => saveNotify({ ...notify, threshold: v }), 400);
  }

  async function testNotification() {
    try {
      await api.testNotification();
      toast.ok("Notificación de prueba enviada");
    } catch (e) {
      toast.err(String(e));
    }
  }

  // ------------------------------------------------------------------ google drive sync
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api.syncStatus().then(value=>{setSync(value);setClientId(value.client_id);}).catch(() => {});
  }, []);

  useEffect(() => {
    if (sync?.client_id) setClientId(sync.client_id);
  }, [sync?.client_id]);

  async function run(kind: string, fn: () => SyncStatus | Promise<SyncStatus>, okMsg: string) {
    setBusy(kind);
    try {
      const s = await fn();
      setSync(s);
      toast.ok(okMsg);
    } catch (e) {
      toast.err(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function downloadFromDrive() {
    setBusy("download");
    try {
      const s = await api.syncDownload();
      setSync(s);
      await reloadProfiles();
      toast.ok("Configuración descargada y aplicada al ratón");
    } catch (e) {
      toast.err(String(e));
    } finally {
      setBusy(null);
    }
  }

  const [autostart,setAutostart]=useState<boolean|null>(null);
  const [startupBusy,setStartupBusy]=useState(false);
  useEffect(()=>{api.getAutostart().then(setAutostart).catch(e=>toast.err(String(e)));},[toast]);
  async function toggleStartup(enabled:boolean){
    setStartupBusy(true);
    try { await api.setAutostart(enabled); setAutostart(enabled); }
    catch(e){toast.err(String(e));}
    finally{setStartupBusy(false);}
  }
  useEffect(()=>{
    if(!sync || clientId.trim()===sync.client_id)return;
    const timer=window.setTimeout(()=>{api.syncSetClientId(clientId.trim()).then(setSync).catch(e=>toast.err(String(e)));},600);
    return()=>window.clearTimeout(timer);
  },[clientId,sync,toast]);

  const lastSync = sync?.last_sync ? new Date(sync.last_sync * 1000).toLocaleString() : "Nunca";

  // ------------------------------------------------------------------ local backup
  async function exportLocal() {
    try {
      const backup = await api.exportConfig();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `as-x11-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.ok("Copia exportada");
    } catch (e) {
      toast.err(String(e));
    }
  }

  async function importLocal(file: File) {
    try {
      const backup = JSON.parse(await file.text());
      await api.importConfig(backup);
      await reloadProfiles();
      toast.ok("Copia restaurada en el ratón");
    } catch (e) {
      toast.err(String(e));
    }
  }

  return (
    <div className="page grid" style={{ gap: 18 }}>
      <Card title="Windows" desc="La batería permanece en la bandeja del sistema, junto al reloj.">
        <label className="startup-check"><input type="checkbox" checked={autostart===true} disabled={autostart===null || startupBusy} onChange={e=>toggleStartup(e.target.checked)}/><span><b>Iniciar con Windows</b><small>Solo se activa al marcar esta casilla. Inicio discreto en la bandeja.</small></span></label>
        <p className="small muted">Cerrar la ventana mantiene el indicador de batería. Para cerrar la aplicación, usa Salir en su icono junto al reloj.</p>
      </Card>
      <Card icon={<InfoIcon />} title="Dispositivo" desc="Tu Attack Shark X11">
        <SettingRow label="Producto" hint="Ratón conectado">
          <span>{connected ? status?.device?.product : "Ratón apagado o sin conexión"}</span>
        </SettingRow>
        <SettingRow label="Conexión" hint="Enlace activo actualmente">
          {connected && status?.device ? (
            <Badge tone="accent">{CONNECTION_LABEL[status.device.connection] ?? status.device.connection}</Badge>
          ) : (
            <span className="muted">—</span>
          )}
        </SettingRow>

      </Card>

      <Card
        icon={<BellIcon />}
        title="Avisos de batería"
        desc="Notificaciones del sistema cuando el ratón se está quedando sin carga"
      >
        <SettingRow label="Avisar con batería baja" hint="Muestra un aviso de Windows al bajar del umbral">
          <Switch checked={n.low_battery} onChange={(v) => notify && saveNotify({ ...notify, low_battery: v })} />
        </SettingRow>
        <SettingRow label="Umbral de aviso" hint={`Avisar cuando quede un ${threshold}% o menos`}>
          <div className="row" style={{ width: 280 }}>
            <Slider min={5} max={60} step={5} value={threshold} onChange={onThreshold} />
            <span className="mono" style={{ width: 46, textAlign: "right" }}>
              {threshold}%
            </span>
          </div>
        </SettingRow>
        <SettingRow label="Avisar al terminar la carga" hint="Cuando el ratón alcanza el 100%">
          <Switch checked={n.charge_full} onChange={(v) => notify && saveNotify({ ...notify, charge_full: v })} />
        </SettingRow>
        <div className="row wrap" style={{ marginTop: 16, gap: 12 }}>
          <button className="btn sm" onClick={testNotification}>
            <ZapIcon width={15} height={15} /> Probar aviso
          </button>
          <span className="muted small">Los avisos aparecen aunque la ventana esté minimizada.</span>
        </div>
      </Card>

      <Card
        icon={<CloudIcon />}
        title="Sincronización con Google Drive"
        desc="Guarda y restaura toda tu configuración en tu propia cuenta de Google"
        actions={
          sync?.connected ? (
            <Badge tone="on">
              <span className="dot" /> Conectado
            </Badge>
          ) : (
            <Badge>Sin conectar</Badge>
          )
        }
      >
        <div className="field">
          <label>Client ID de OAuth</label>
          <div className="row" style={{ gap: 10 }}>
            <input
              type="text"
              className="client-id-input"
              placeholder="1234567890-xxxx.apps.googleusercontent.com"
              value={clientId}
              spellCheck={false}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
        </div>

        {!sync?.configured ? (
          <details className="sync-help" open style={{ marginTop: 16 }}>
            <summary>¿Cómo consigo mi Client ID? (2 minutos)</summary>
            <ol>
              <li>
                Entra en{" "}
                <button
                  className="link-inline"
                  onClick={() =>
                    openUrl("https://console.cloud.google.com/apis/credentials").catch(() =>
                      toast.err("No se pudo abrir el navegador"),
                    )
                  }
                >
                  Google Cloud Console
                </button>{" "}
                y crea un proyecto.
              </li>
              <li>
                Activa la <b>Google Drive API</b> (APIs y servicios → Biblioteca).
              </li>
              <li>
                Configura la pantalla de consentimiento (tipo <b>Externo</b>) y añádete como{" "}
                <b>usuario de prueba</b>.
              </li>
              <li>
                Credenciales → <b>Crear ID de cliente OAuth</b> → tipo <b>Aplicación de escritorio</b>.
              </li>
              <li>Copia el Client ID generado y pégalo en el campo de arriba.</li>
            </ol>
            <p className="muted small">
              AS x11 solo puede ver los archivos que él mismo crea en tu Drive. No usa servidores
              intermedios: la configuración se guarda directamente en tu cuenta.
            </p>
          </details>
        ) : sync.connected ? (
          <>
            <SettingRow label="Cuenta" hint="Sesión de Google activa">
              <Badge tone="accent">{sync.email ?? "Cuenta de Google"}</Badge>
            </SettingRow>
            <SettingRow label="Última sincronización" hint="Se actualiza al subir o descargar">
              <span className="muted small">{lastSync}</span>
            </SettingRow>
            <div className="row wrap" style={{ marginTop: 16, gap: 10 }}>
              <button
                className="btn primary"
                disabled={!connected || busy !== null}
                onClick={() => run("upload", () => api.syncUpload(), "Configuración subida a Drive")}
              >
                {busy === "upload" ? (
                  <span className="spinner" />
                ) : (
                  <UploadIcon width={16} height={16} />
                )}
                Subir configuración
              </button>
              <button className="btn" disabled={!connected || busy !== null} onClick={downloadFromDrive}>
                {busy === "download" ? (
                  <span className="spinner" />
                ) : (
                  <DownloadIcon width={16} height={16} />
                )}
                Descargar
              </button>
              <button
                className="btn danger"
                disabled={busy !== null}
                onClick={() => run("disconnect", () => api.syncDisconnect(), "Sesión de Google cerrada")}
              >
                <LinkIcon width={16} height={16} /> Cerrar sesión
              </button>
            </div>
          </>
        ) : (
          <div className="row wrap" style={{ marginTop: 16, gap: 12 }}>
            <button
              className="btn primary"
              disabled={busy !== null}
              onClick={() => run("connect", () => api.syncConnect(), "Conectado con Google Drive")}
            >
              {busy === "connect" ? <span className="spinner" /> : <LinkIcon width={16} height={16} />}
              Conectar con Google
            </button>
            <span className="muted small">Se abrirá tu navegador para autorizar el acceso.</span>
          </div>
        )}
      </Card>

      <Card
        icon={<DownloadIcon />}
        title="Copia de seguridad local"
        desc="Exporta o restaura la configuración desde un archivo .json"
      >
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn" disabled={!connected} onClick={exportLocal}>
            <DownloadIcon width={16} height={16} /> Exportar a archivo
          </button>
          <label className={`btn ${connected ? "" : "disabled"}`}>
            <UploadIcon width={16} height={16} /> Importar archivo
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              disabled={!connected}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importLocal(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </Card>


      <Card icon={<MouseIcon />} title="Acerca de AS x11" desc="Alternativa moderna al software oficial">
        <div className="small muted" style={{ lineHeight: 1.8 }}>
          AS x11 es un configurador no oficial para el Attack Shark X11. Se comunica directamente con
          el firmware mediante reportes HID, sin servidores intermedios ni telemetría. Aplica los cambios automáticamente y mantiene la batería visible en la bandeja de Windows.
        </div>
        <div className="row wrap" style={{ marginTop: 16 }}>
          <button
            className="btn ghost sm"
            onClick={async () => {
              try {
                await openUrl("https://github.com/HarukaYamamoto0/attack-shark-x11-driver");
              } catch {
                toast.err("No se pudo abrir el enlace");
              }
            }}
          >
            Protocolo de referencia
          </button>
          <span className="muted small">Licencia MIT · No afiliado a Attack Shark</span>
        </div>
      </Card>
    </div>
  );
}
