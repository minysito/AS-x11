// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ButtonConfig, ButtonSlot, LightingConfig } from "../lib/api";
import { useDevice } from "../lib/device";
import { useAutoApply } from "../lib/autoApply";
import { Card, Spinner } from "../components/ui";
import { NotConnected } from "../components/NotConnected";
import { LoadError } from "../components/LoadError";
import { ActionPicker } from "../components/ActionPicker";
import { MouseVisual, MOUSE_BUTTONS } from "../components/MouseVisual";
import { Action, MODIFIER_FLAGS, actionLabel } from "../lib/actions";
import { keyName } from "../lib/keys";

export function ButtonsPage({ onLighting }: {onLighting:()=>void}) {
  const { status,profile }=useDevice();
  const [config,setConfig]=useState<ButtonConfig|null>(null);
  const [lighting,setLighting]=useState<LightingConfig|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [selected,setSelected]=useState(0);
  const [editing,setEditing]=useState<number|null>(null);
  const {apply,saving}=useAutoApply<ButtonConfig>(`buttons:${profile}`,api.setButtons);
  const load=()=>{
    setError(null);
    api.getButtons(profile).then(setConfig).catch(e=>setError(String(e)));
    api.getLighting(profile).then(setLighting).catch(()=>{});
  };
  useEffect(()=>{if(status?.connected)load();},[profile,status?.connected]);
  if(!status?.connected)return <NotConnected/>;
  if(error)return <LoadError message={error} retry={load}/>;
  if(!config)return <div className="page"><Spinner/></div>;
  function assign(index:number,slot:ButtonSlot){
    if(!config)return;
    const slots=[...config.slots];slots[index]=slot;
    const next={...config,slots};setConfig(next);apply(next);
  }
  const choose=(slot:number)=>{setSelected(slot);setEditing(slot);};
  return <div className="page buttons-layout">
    <MouseVisual selected={selected} onSelect={choose} color={lighting?.color} mode={lighting?.mode} brightness={lighting?.brightness} onLed={onLighting}/>
    <Card title="Tus cinco botones" desc="Selecciona una zona del ratón o una acción. Los cambios se aplican solos."
      actions={<span className="apply-status" role="status">{saving?"Aplicando…":"Cambios automáticos"}</span>}>
      {MOUSE_BUTTONS.map((button,index)=><button key={button.slot} className={`mouse-action ${selected===button.slot?"selected":""}`}
        onMouseEnter={()=>setSelected(button.slot)} onFocus={()=>setSelected(button.slot)} onClick={()=>choose(button.slot)}>
        <span className="mouse-action-number">{index+1}</span><span><b>{button.label}</b><small>{slotLabel(config.slots[button.slot])}</small></span><span>↗</span>
      </button>)}
      <p className="small muted">La rueda conserva el desplazamiento arriba y abajo. Su clic central se configura en el botón 3.</p>
      <button className="btn" onClick={onLighting}>◉ Configurar luz LED</button>
    </Card>
    {editing!==null&&<ActionPicker value={config.slots[editing]} onSelect={slot=>assign(editing,slot)} onClose={()=>setEditing(null)}/>}
  </div>;
}
function slotLabel(slot:ButtonSlot){
  if(slot.action===Action.KEYBOARD)return [...MODIFIER_FLAGS.filter(m=>slot.modifiers&m.value).map(m=>m.label),keyName(slot.usage)].join(" + ");
  if(slot.action===Action.CUSTOM_MACRO)return `Macro ${slot.usage}`;
  return actionLabel(slot.action);
}
