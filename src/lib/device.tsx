// SPDX-License-Identifier: GPL-3.0-or-later
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import { api } from "./api";
import type { Battery, DeviceInfo, NotifyPrefs, Status } from "./api";

interface DeviceContextValue {
  ready: boolean;
  status: Status | null;
  battery: Battery | null;
  devices: DeviceInfo[];
  connecting: boolean;
  error: string | null;
  profile: number;
  maxProfiles: number;
  notify: NotifyPrefs | null;
  lowBattery: boolean;
  setProfile: (n: number) => void;
  setNotify: (prefs: NotifyPrefs) => Promise<void>;
  connect: (pid?: number) => Promise<boolean>;
  refreshDevices: () => Promise<void>;
  reloadProfiles: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

const EMPTY_BATTERY: Battery = { known: false, status: 0, percentage: 0, charging: false };

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfileState] = useState(1);
  const [maxProfiles, setMaxProfiles] = useState(1);
  const [notify, setNotifyState] = useState<NotifyPrefs | null>(null);
  const bootstrapped = useRef(false);
  const inFlight = useRef(false);
  const curPid = useRef<number | null>(null);
  const lastKey = useRef<string | null>(null);
  const retryAt = useRef(0);

  const setNotify = useCallback(async (prefs: NotifyPrefs) => {
    await api.setNotifyPrefs(prefs);
    setNotifyState(prefs);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      setDevices(await api.listDevices());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const reloadProfiles = useCallback(async () => {
    try {
      const ps = await api.getProfileSettings();
      setMaxProfiles(Math.max(1, ps.max));
      setProfileState(Math.min(Math.max(1, ps.current), Math.max(1, ps.max)));
    } catch {
      /* ignore */
    }
  }, []);

  const connect = useCallback(
    async (pid?: number) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setConnecting(true);
      setError(null);
      try {
        const s = await api.connect(pid);
        setStatus(s);
        setBattery(s.battery ?? EMPTY_BATTERY);
        await reloadProfiles();
        return true;
      } catch (e) {
        setError(String(e));
        setStatus({ connected: false, device: null, battery: null, version: null });
        setBattery(null);
        return false;
      } finally {
        inFlight.current = false;
        setConnecting(false);
      }
    },
    [reloadProfiles],
  );

  const setProfile = useCallback((n: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    api.setProfileSettings(n, maxProfiles).then(() => {
      setProfileState(n);
      setError(null);
    }).catch((e) => setError(String(e))).finally(() => { inFlight.current = false; });
  }, [maxProfiles]);

  // Bootstrap once.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      await refreshDevices();
      await connect();
      try {
        setNotifyState(await api.getNotifyPrefs());
      } catch {
        /* ignore */
      }
      setReady(true);
    })();
  }, [connect, refreshDevices]);

  // Live battery + telemetry events from the backend.
  useEffect(() => {
    const unlisten: Array<() => void> = [];
    let disposed = false;
    const retain = (u: () => void) => { if (disposed) u(); else unlisten.push(u); };
    listen<Battery>("device://battery", (e) => setBattery(e.payload)).then(retain).catch(() => {});
    listen<number[]>("device://event", (e) => {
      const data = e.payload;
      if (data[0] === 3 && data[1] === 0x55 && data[2] === 0x80 && data[3] < 5) {
        setProfileState(data[3] + 1);
      }
    }).then(retain).catch(() => {});
    return () => { disposed = true; unlisten.forEach((u) => u()); };
  }, []);

  // Track which link we are currently attached to.
  useEffect(() => {
    curPid.current = status?.device?.pid ?? null;
  }, [status?.device?.pid]);

  // Radio power can change while the same USB receiver remains plugged in.
  useEffect(() => {
    let ticking = false;
    const tick = async () => {
      if (inFlight.current || ticking) return;
      ticking = true;
      try {
        const devs = await api.listDevices();
        setDevices(devs);
        const key = [...new Set(devs.map(d => d.pid))].sort().join(',');
        const changed = lastKey.current !== null && key !== lastKey.current;
        lastKey.current = key;
        if (!devs.length) {
          setStatus({ connected:false,device:null,battery:null,version:null });
          setBattery(null);
          return;
        }
        if (changed || (curPid.current === null && Date.now() >= retryAt.current)) {
          retryAt.current = Date.now()+5000;
          await connect();
          return;
        }
        const next = await api.status();
        setStatus(next);
        setBattery(next.connected ? next.battery : null);
        if (next.connected) setError(null);
      } catch { /* The next tick retries without blocking the UI. */ }
      finally { ticking=false; }
    };
    const timer=window.setInterval(tick,2500);
    return () => window.clearInterval(timer);
  },[connect]);

  useEffect(() => {
    let disposed=false;
    let unlisten: (()=>void) | undefined;
    listen<boolean>('device://connection', async (event) => {
      if (!event.payload) {
        setStatus(previous => previous ? {...previous,connected:false} : previous);
        setBattery(null);
      } else {
        const next=await api.status();
        if (disposed) return;
        setStatus(next); setBattery(next.battery); setError(null);
        await reloadProfiles();
      }
    }).then(u => { if(disposed)u();else unlisten=u; }).catch(()=>{});
    return () => { disposed=true; unlisten?.(); };
  },[reloadProfiles]);

  const lowBattery = !!(
    battery?.known &&
    !battery.charging &&
    notify?.low_battery &&
    battery.percentage <= notify.threshold
  );

  const value = useMemo<DeviceContextValue>(
    () => ({
      ready,
      status,
      battery,
      devices,
      connecting,
      error,
      profile,
      maxProfiles,
      notify,
      lowBattery,
      setProfile,
      setNotify,
      connect,
      refreshDevices,
      reloadProfiles,
    }),
    [
      ready,
      status,
      battery,
      devices,
      connecting,
      error,
      profile,
      maxProfiles,
      notify,
      lowBattery,
      setNotify,
      connect,

      refreshDevices,
      reloadProfiles,
    ],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice debe usarse dentro de DeviceProvider");
  return ctx;
}
