// SPDX-License-Identifier: GPL-3.0-or-later
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MinusIcon, XIcon } from "./icons";

/**
 * Frameless-window controls. The window has no OS title bar, so these buttons
 * plus the draggable regions are the only chrome.
 */
export function WindowControls() {
  const win = getCurrentWindow();
  return (
    <div className="window-controls" data-tauri-drag-region>
      <button className="win-btn" title="Minimizar" onClick={() => win.minimize()}>
        <MinusIcon width={15} height={15} />
      </button>
      <button className="win-btn close" title="Ocultar en la bandeja" aria-label="Ocultar en la bandeja" onClick={() => win.close()}>
        <XIcon width={15} height={15} />
      </button>
    </div>
  );
}
