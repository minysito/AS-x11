// SPDX-License-Identifier: GPL-3.0-or-later
import { MouseIcon } from "./icons";
import { Card } from "./ui";

export function NotConnected() {
  return (
    <div className="page">
      <Card>
        <div className="center-box">
          <div className="empty-icon">
            <MouseIcon />
          </div>
          <h2>Ratón no conectado</h2>
          <p className="muted small" style={{ maxWidth: 400 }}>
            Enciende tu X11 o conecta su cable USB. La aplicación se actualizará automáticamente.
          </p>
        </div>
      </Card>
    </div>
  );
}
