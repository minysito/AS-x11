// SPDX-License-Identifier: GPL-3.0-or-later
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertIcon, CheckIcon } from "../components/icons";

interface Toast {
  id: number;
  message: string;
  kind: "ok" | "err" | "info";
}

interface ToastContextValue {
  push: (message: string, kind?: Toast["kind"]) => void;
  ok: (message: string) => void;
  err: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      ok: (m) => push(m, "ok"),
      err: (m) => push(m, "err"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span style={{ color: t.kind === "err" ? "var(--red)" : t.kind === "ok" ? "var(--green)" : "var(--cyan)" }}>
              {t.kind === "err" ? <AlertIcon width={16} height={16} /> : <CheckIcon width={16} height={16} />}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
