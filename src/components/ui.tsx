// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BatteryIcon } from "./icons";
import type { Battery, Rgb } from "../lib/api";

// --------------------------------------------------------------------------- Card

export function Card({
  icon,
  title,
  desc,
  children,
  style,
  className = "",
  actions,
}: {
  icon?: ReactNode;
  title?: string;
  desc?: string;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || icon || actions) && (
        <header className="card-head">
          {icon && <div className="card-icon">{icon}</div>}
          <div style={{ flex: 1 }}>
            {title && <h3>{title}</h3>}
            {desc && <div className="desc">{desc}</div>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

// --------------------------------------------------------------------------- Switch

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`switch ${checked ? "on" : ""}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    />
  );
}

// --------------------------------------------------------------------------- Segmented

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  full,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div className={`segmented ${full ? "full" : ""}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------- Slider

export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

// --------------------------------------------------------------------------- Color

export function rgbToHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

export function ColorField({
  value,
  onChange,
  disabled,
}: {
  value: Rgb;
  onChange: (v: Rgb) => void;
  disabled?: boolean;
}) {
  const hex = rgbToHex(value);
  const [draft, setDraft] = useState(hex.toUpperCase());
  useEffect(() => setDraft(hex.toUpperCase()), [hex]);
  return (
    <div className="color-input">
      <input
        type="color"
        aria-label="Seleccionar color del LED"
        value={hex}
        disabled={disabled}
        onChange={(e) => onChange(hexToRgb(e.target.value))}
      />
      <input
        type="text"
        className="color-hex"
        value={draft}
        aria-label="Color hexadecimal del LED"
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
            setDraft(v);
            if (/^#?[0-9a-fA-F]{6}$/.test(v)) onChange(hexToRgb(v));
          }
        }}
        onBlur={() => setDraft(hex.toUpperCase())}
      />
    </div>
  );
}

// --------------------------------------------------------------------------- Misc

export function StatTile({ k, v, unit }: { k: string; v: ReactNode; unit?: string }) {
  return (
    <div className="stat">
      <span className="k">{k}</span>
      <span className="v">
        {v}
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "on" | "off" | "warn" | "accent";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Spinner() {
  return <div className="spinner" />;
}

// --------------------------------------------------------------------------- Battery

export function BatteryRing({ battery }: { battery: Battery | null }) {
  const pct = battery?.known ? battery.percentage : 0;
  const charging = battery?.charging ?? false;
  const size = 92;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = charging ? "#35d0ff" : pct > 40 ? "#35d07f" : pct > 15 ? "#ffc14d" : "#ff5470";

  return (
    <div className="battery-ring">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        {battery?.known && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
          />
        )}
        <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#eef1f7"
            fontSize="20"
            fontWeight="700"
          >
            {battery?.known ? `${pct}%` : "—"}
          </text>
        </g>
      </svg>
      <div className="cap" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <BatteryIcon width={13} height={13} style={{ color }} />
        {charging ? "Cargando" : battery?.known ? "Batería" : "Sin datos"}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- SettingRow

export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="label">
        <b>{label}</b>
        {hint && <span>{hint}</span>}
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        {children}
      </div>
    </div>
  );
}
