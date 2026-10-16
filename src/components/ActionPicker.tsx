// SPDX-License-Identifier: GPL-3.0-or-later
import { useMemo, useState } from "react";
import type { ButtonSlot } from "../lib/api";
import { ACTION_LIST, Action, MODIFIER_FLAGS } from "../lib/actions";
import { KEYPAD } from "../lib/keys";
import { ChevronIcon, KeyboardIcon, MacroIcon, XIcon } from "./icons";

export function ActionPicker({
  value,
  onSelect,
  onClose,
}: {
  value: ButtonSlot;
  onSelect: (slot: ButtonSlot) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"action" | "key" | "macro">(
    value.action === Action.KEYBOARD ? "key" : value.action === Action.CUSTOM_MACRO ? "macro" : "action",
  );
  const [search, setSearch] = useState("");
  const [modifiers, setModifiers] = useState(value.modifiers);
  const [keySearch, setKeySearch] = useState("");

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? ACTION_LIST.filter((a) => a.label.toLowerCase().includes(q))
      : ACTION_LIST;
    const map = new Map<string, typeof ACTION_LIST>();
    for (const a of filtered) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return [...map.entries()];
  }, [search]);

  const keys = useMemo(() => {
    const q = keySearch.trim().toLowerCase();
    return q ? KEYPAD.filter((k) => k.name.toLowerCase().includes(q) || k.hid.toLowerCase().includes(q)) : KEYPAD;
  }, [keySearch]);

  function chooseAction(action: number) {
    if (action === Action.KEYBOARD) {
      setStep("key");
      return;
    }
    if (action === Action.CUSTOM_MACRO) {
      setStep("macro");
      return;
    }
    onSelect({ action, modifiers: 0, usage: 0 });
    onClose();
  }

  function toggleModifier(flag: number) {
    setModifiers((m) => m ^ flag);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          {step !== "action" && (
            <button className="btn icon ghost sm" onClick={() => setStep("action")} title="Volver">
              <ChevronIcon style={{ transform: "rotate(180deg)" }} />
            </button>
          )}
          <h3 style={{ flex: 1 }}>
            {step === "action" ? "Elegir acción" : step === "key" ? "Elegir tecla" : "Elegir macro"}
          </h3>
          <button className="btn icon ghost sm" onClick={onClose}>
            <XIcon />
          </button>
        </div>

        {step === "action" && (
          <>
            <div style={{ padding: "14px 22px 0" }}>
              <input
                type="text"
                placeholder="Buscar acción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%" }}
                autoFocus
              />
            </div>
            <div className="modal-body action-groups">
              {groups.map(([group, items]) => (
                <div className="action-group" key={group}>
                  <h4>{group}</h4>
                  <div className="action-grid">
                    {items.map((a) => (
                      <button
                        key={a.value}
                        className={`action-option ${value.action === a.value ? "active" : ""}`}
                        onClick={() => chooseAction(a.value)}
                      >
                        {a.value === Action.KEYBOARD && <KeyboardIcon width={15} height={15} />}
                        {a.value === Action.CUSTOM_MACRO && <MacroIcon width={15} height={15} />}
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {groups.length === 0 && <div className="muted small">Sin resultados</div>}
            </div>
          </>
        )}

        {step === "key" && (
          <>
            <div style={{ padding: "14px 22px 0", display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="row wrap">
                {MODIFIER_FLAGS.map((m) => (
                  <button
                    key={m.value}
                    className={`btn sm ${(modifiers & m.value) !== 0 ? "primary" : "ghost"}`}
                    onClick={() => toggleModifier(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Buscar tecla…"
                value={keySearch}
                onChange={(e) => setKeySearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-body">
              <div className="action-grid">
                {keys.map((k) => (
                  <button
                    key={k.code}
                    className={`action-option ${value.usage === k.code && value.action === Action.KEYBOARD ? "active" : ""}`}
                    onClick={() => {
                      onSelect({ action: Action.KEYBOARD, modifiers, usage: k.code });
                      onClose();
                    }}
                    title={k.hid}
                  >
                    <span className="kbd">{k.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "macro" && (
          <div className="modal-body">
            <div className="action-grid">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className="action-option"
                  onClick={() => {
                    onSelect({ action: Action.CUSTOM_MACRO, modifiers: 0, usage: n });
                    onClose();
                  }}
                >
                  <MacroIcon width={15} height={15} /> Macro {n}
                </button>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 14 }}>
              La edición de macros llegará en una próxima actualización.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
