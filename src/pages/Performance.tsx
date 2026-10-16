// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAutoApply } from "../lib/autoApply";
import { useDevice } from "../lib/device";
import { Card, Segmented, Spinner } from "../components/ui";
import { PollIcon } from "../components/icons";
import { NotConnected } from "../components/NotConnected";
import { LoadError } from "../components/LoadError";

export function PerformancePage() {
  const { status, profile } = useDevice();
  const [rate,setRate] = useState<number | null>(null);
  const [error,setError] = useState<string | null>(null);
  const { apply,saving } = useAutoApply<number>(`polling:${profile}`, value => api.setPolling(profile,value));
  const load = () => { setError(null); api.getPolling(profile).then(setRate).catch(e=>setError(String(e))); };
  useEffect(() => { if(status?.connected) load(); },[profile,status?.connected]);
  if(!status?.connected) return <NotConnected />;
  if(error) return <LoadError message={error} retry={load} />;
  return <div className="page"><Card icon={<PollIcon />} title="Frecuencia de respuesta"
    desc="Elige tu frecuencia. Se aplica automáticamente."
    actions={<span className="apply-status" role="status">{saving ? "Aplicando…" : "Cambios automáticos"}</span>}>
    {rate === null ? <Spinner /> : <>
      <Segmented full options={[125,250,500,1000].map(value=>({value,label:`${value} Hz`}))}
        value={rate} onChange={value=>{setRate(value);apply(value);}} />
      <p className="small muted">1000 Hz ofrece la respuesta más rápida; una frecuencia menor reduce el consumo en modo inalámbrico.</p>
    </>}
  </Card></div>;
}
