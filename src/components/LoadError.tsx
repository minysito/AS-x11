// SPDX-License-Identifier: GPL-3.0-or-later
import { Card } from "./ui";

export function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="page"><Card title="No se pudo leer el ratón">
    <p role="alert">{message}</p>
    <p className="muted">Comprueba el enlace activo y cierra el software original.</p>
    <button className="btn primary" onClick={retry}>Volver a intentar</button>
  </Card></div>;
}
