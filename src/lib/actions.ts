// SPDX-License-Identifier: GPL-3.0-or-later
// Button / key action catalogue for the X11 firmware.

export const Action = {
  DISABLE_BUTTON: 0x01,
  LEFT_CLICK: 0x02,
  RIGHT_CLICK: 0x03,
  MIDDLE_CLICK: 0x04,
  BACKWARD: 0x05,
  FORWARD: 0x06,
  DOUBLE_CLICK: 0x07,
  FIRE: 0x08,
  SCROLL_UP: 0x09,
  SCROLL_DOWN: 0x0a,
  GLOBAL_DPI_CYCLE: 0x0d,
  GLOBAL_DPI_PLUS: 0x0e,
  GLOBAL_DPI_MINUS: 0x0f,
  EASY_AIM: 0x10,
  KEYBOARD: 0x11,
  CUSTOM_MACRO: 0x12,
  MEDIA_PLAYER: 0x15,
  PREVIOUS_TRACK: 0x16,
  NEXT_TRACK: 0x17,
  PLAY_PAUSE: 0x18,
  STOP: 0x19,
  MUTE: 0x1a,
  VOL_PLUS: 0x1b,
  VOL_MINUS: 0x1c,
  CALCULATOR: 0x1d,
  EMAIL: 0x1e,
  BROWSER_FORWARD: 0x20,
  BROWSER_BACKWARD: 0x21,
  BROWSER_STOP: 0x22,
  MY_COMPUTER: 0x23,
  BROWSER_REFRESH: 0x24,
  BROWSER_HOME: 0x25,
  BROWSER_SEARCH: 0x26,
  PROFILE_CYCLE: 0x34,
  PROFILE_UP: 0x35,
  PROFILE_DOWN: 0x36,
  MODE_KEY: 0x3c,
  POLLING_RATE_CYCLE: 0x40,
} as const;

export type ActionValue = (typeof Action)[keyof typeof Action];

export interface ActionMeta {
  value: number;
  label: string;
  group: string;
}

export const ACTION_LIST: ActionMeta[] = [
  { value: Action.DISABLE_BUTTON, label: "Desactivado", group: "Ratón" },
  { value: Action.LEFT_CLICK, label: "Clic izquierdo", group: "Ratón" },
  { value: Action.RIGHT_CLICK, label: "Clic derecho", group: "Ratón" },
  { value: Action.MIDDLE_CLICK, label: "Clic central", group: "Ratón" },
  { value: Action.BACKWARD, label: "Atrás", group: "Ratón" },
  { value: Action.FORWARD, label: "Adelante", group: "Ratón" },
  { value: Action.DOUBLE_CLICK, label: "Doble clic", group: "Ratón" },
  { value: Action.FIRE, label: "Fuego (triple clic)", group: "Ratón" },
  { value: Action.SCROLL_UP, label: "Desplazar arriba", group: "Ratón" },
  { value: Action.SCROLL_DOWN, label: "Desplazar abajo", group: "Ratón" },
  { value: Action.EASY_AIM, label: "Puntería fácil", group: "Ratón" },

  { value: Action.GLOBAL_DPI_CYCLE, label: "Cambiar DPI", group: "DPI" },
  { value: Action.GLOBAL_DPI_PLUS, label: "Subir DPI", group: "DPI" },
  { value: Action.GLOBAL_DPI_MINUS, label: "Bajar DPI", group: "DPI" },
  { value: Action.POLLING_RATE_CYCLE, label: "Cambiar tasa de sondeo", group: "DPI" },

  { value: Action.PROFILE_CYCLE, label: "Cambiar perfil", group: "Perfil" },
  { value: Action.PROFILE_UP, label: "Perfil siguiente", group: "Perfil" },
  { value: Action.PROFILE_DOWN, label: "Perfil anterior", group: "Perfil" },

  { value: Action.KEYBOARD, label: "Tecla del teclado", group: "Teclado" },
  { value: Action.CUSTOM_MACRO, label: "Macro", group: "Teclado" },

  { value: Action.MEDIA_PLAYER, label: "Reproductor multimedia", group: "Multimedia" },
  { value: Action.PREVIOUS_TRACK, label: "Pista anterior", group: "Multimedia" },
  { value: Action.NEXT_TRACK, label: "Pista siguiente", group: "Multimedia" },
  { value: Action.PLAY_PAUSE, label: "Reproducir / Pausar", group: "Multimedia" },
  { value: Action.STOP, label: "Detener", group: "Multimedia" },
  { value: Action.MUTE, label: "Silenciar", group: "Multimedia" },
  { value: Action.VOL_PLUS, label: "Subir volumen", group: "Multimedia" },
  { value: Action.VOL_MINUS, label: "Bajar volumen", group: "Multimedia" },

  { value: Action.CALCULATOR, label: "Calculadora", group: "Aplicaciones" },
  { value: Action.EMAIL, label: "Correo", group: "Aplicaciones" },
  { value: Action.MY_COMPUTER, label: "Mi PC", group: "Aplicaciones" },
  { value: Action.BROWSER_FORWARD, label: "Navegador: adelante", group: "Navegador" },
  { value: Action.BROWSER_BACKWARD, label: "Navegador: atrás", group: "Navegador" },
  { value: Action.BROWSER_STOP, label: "Navegador: detener", group: "Navegador" },
  { value: Action.BROWSER_REFRESH, label: "Navegador: recargar", group: "Navegador" },
  { value: Action.BROWSER_HOME, label: "Navegador: inicio", group: "Navegador" },
  { value: Action.BROWSER_SEARCH, label: "Navegador: buscar", group: "Navegador" },
  { value: Action.MODE_KEY, label: "Tecla de modo", group: "Navegador" },
];

export const ACTION_MAP = new Map<number, ActionMeta>(ACTION_LIST.map((a) => [a.value, a]));

export function actionLabel(value: number): string {
  return ACTION_MAP.get(value)?.label ?? `Acción 0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
}

export const Modifier = {
  None: 0x0,
  CTRL: 0x1,
  SHIFT: 0x2,
  ALT: 0x4,
  WIN: 0x8,
} as const;

export const MODIFIER_FLAGS: { value: number; label: string }[] = [
  { value: Modifier.CTRL, label: "Ctrl" },
  { value: Modifier.SHIFT, label: "Shift" },
  { value: Modifier.ALT, label: "Alt" },
  { value: Modifier.WIN, label: "Win" },
];

// Physical button layout of the X11. `slot` indexes BUTTON_OFFSETS in the
// firmware report; not every slot is used by the X11.
export interface ButtonDescriptor {
  slot: number;
  label: string;
  /** Slots that are informational only and cannot be reassigned. */
  readOnly?: boolean;
}

export const BUTTONS: ButtonDescriptor[] = [
  { slot: 0, label: "Clic izquierdo" },
  { slot: 1, label: "Clic derecho" },
  { slot: 2, label: "Clic central / rueda" },
  { slot: 5, label: "Botón DPI" },
  { slot: 6, label: "Botón lateral 1" },
  { slot: 7, label: "Botón lateral 2" },
  { slot: 16, label: "Rueda arriba", readOnly: true },
  { slot: 17, label: "Rueda abajo", readOnly: true },
];
