// SPDX-License-Identifier: GPL-3.0-or-later
interface Pending { value: unknown; write: (value: unknown) => Promise<void>; timer?: number; running: boolean; revision: number; listeners: Array<{ revision: number; resolve: () => void; reject: (error: unknown) => void }> }
const pending = new Map<string, Pending>();
export function pendingValue<T>(key: string): T | undefined { return pending.get(key)?.value as T | undefined; }

async function flush(key: string) {
  const entry = pending.get(key);
  if (!entry || entry.running) return;
  entry.running = true;
  const revision = entry.revision, value = entry.value;
  try {
    await entry.write(value);
    entry.listeners.filter(l => l.revision <= revision).forEach(l => l.resolve());
    window.dispatchEvent(new CustomEvent("settings-applied", { detail: key }));
  } catch (error) {
    entry.listeners.filter(l => l.revision <= revision).forEach(l => l.reject(error));
  } finally {
    entry.listeners = entry.listeners.filter(l => l.revision > revision);
    entry.running = false;
    if (entry.revision > revision) { entry.timer = window.setTimeout(() => flush(key), 300); }
    else { window.clearTimeout(entry.timer); pending.delete(key); }
  }
}

export function queueSetting<T>(key: string, value: T, write: (value: T) => Promise<void>): Promise<void> {
  let entry = pending.get(key);
  if (!entry) { entry = { value, write: write as (v: unknown) => Promise<void>, running: false, revision: 0, listeners: [] }; pending.set(key,entry); }
  entry.value = structuredClone(value);
  entry.write = write as (v: unknown) => Promise<void>;
  entry.revision++;
  window.clearTimeout(entry.timer);
  entry.timer = window.setTimeout(() => flush(key),300);
  const revision = entry.revision;
  return new Promise((resolve,reject) => entry.listeners.push({revision,resolve,reject}));
}


