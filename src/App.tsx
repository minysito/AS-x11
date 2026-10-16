// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { DeviceProvider, useDevice } from "./lib/device";
import { ToastProvider, useToast } from "./lib/toast";
import { NAV, Sidebar } from "./components/Sidebar";
import type { PageId } from "./components/Sidebar";
import { WindowControls } from "./components/WindowControls";
import { PlugIcon } from "./components/icons";
import { CONNECTION_LABEL } from "./lib/api";
import { DashboardPage } from "./pages/Dashboard";
import { DpiPage } from "./pages/Dpi";
import { LightingPage } from "./pages/Lighting";
import { ButtonsPage } from "./pages/Buttons";
import { PerformancePage } from "./pages/Performance";
import { ProfilesPage } from "./pages/Profiles";
import { SettingsPage } from "./pages/Settings";
import "./styles.css";

function Shell() {
  const [page, setPage] = useState<PageId>("dashboard");
  const {
    status,
    battery,
    connecting,
    connect,
    refreshDevices,
    profile,
    maxProfiles,
    setProfile,
    lowBattery,
    error,
  } = useDevice();
  const toast = useToast();
  const warned = useRef(false);
  const lastKind = useRef<string | null>(null);

  const nav = NAV.find((n) => n.id === page) ?? NAV[0];
  const connected = status?.connected ?? false;
  const deviceKind = status?.device?.connection ?? "";

  // Fire a single in-app warning each time the battery crosses the threshold.
  useEffect(() => {
    if (lowBattery && !warned.current) {
      warned.current = true;
      toast.err(`Batería baja: queda un ${battery?.percentage ?? 0}%. Conecta el cable para cargar.`);
    }
    if (!lowBattery) warned.current = false;
  }, [lowBattery, battery?.percentage, toast]);

  // Announce automatic link switches (cable <-> 2.4 GHz).
  useEffect(() => {
    const kind = status?.device?.connection ?? null;
    if (kind && lastKind.current && kind !== lastKind.current) {
      toast.push(`Enlace cambiado: ${CONNECTION_LABEL[kind] ?? kind}`, "info");
    }
    lastKind.current = kind;
  }, [status?.device?.connection, toast]);

  async function handleReconnect() {
    try {
      await refreshDevices();
      if (await connect()) toast.ok("Dispositivo reconectado");
    } catch (e) {
      toast.err(String(e));
    }
  }

  function renderPage() {
    switch (page) {
      case "dashboard":
        return <DashboardPage />;
      case "dpi":
        return <DpiPage />;
      case "lighting":
        return <LightingPage />;
      case "buttons":
        return <ButtonsPage onLighting={() => setPage("lighting")} />;
      case "performance":
        return <PerformancePage />;
      case "profiles":
        return <ProfilesPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  }

  return (
    <div className="app">
      <Sidebar
        current={page}
        onNavigate={setPage}
        connected={connected}
        battery={battery}
        deviceKind={deviceKind}
        connecting={connecting}
        onReconnect={handleReconnect}
        profile={profile}
        maxProfiles={maxProfiles}
        setProfile={setProfile}
      />
      <div className="main">
        <WindowControls />
        {error && <div className="battery-alert" role="alert">{error}</div>}
        {lowBattery && connected && (
          <div className="battery-alert">
            <PlugIcon width={16} height={16} />
            <b>Batería baja</b>
            <span>Queda un {battery?.percentage ?? 0}% — conecta el cable para cargar el ratón.</span>
          </div>
        )}
        <div className="content" key={`${page}-${status?.device?.pid ?? 0}-${profile}`}>
          <header className="page-head" data-tauri-drag-region>
            <div>
              <h1>{nav.title}</h1>
              <p>{nav.subtitle}</p>
            </div>
          </header>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DeviceProvider>
        <Shell />
      </DeviceProvider>
    </ToastProvider>
  );
}
