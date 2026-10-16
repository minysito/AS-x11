// SPDX-License-Identifier: GPL-3.0-or-later
import { useId, useState, type CSSProperties } from "react";
import type { Rgb } from "../lib/api";

export const MOUSE_BUTTONS = [
  {slot:0,label:"Clic izquierdo"}, {slot:1,label:"Clic derecho"},
  {slot:2,label:"Clic central · rueda"}, {slot:6,label:"Lateral delantero"},
  {slot:7,label:"Lateral trasero"},
];
const TOP = [
  {x:245,y:208,path:"M173 79 Q222 57 293 40 L293 303 Q263 309 176 303 Q159 301 158 273 L151 103 Q152 88 173 79Z"},
  {x:381,y:208,path:"M333 40 Q402 57 451 79 Q472 88 473 103 L466 273 Q465 301 448 303 Q362 309 333 303Z"},
  {x:313,y:173,path:"M295 131 Q313 121 331 131 L331 209 Q313 220 295 209Z"},
  {x:142,y:291,path:"M139 246 Q144 238 150 243 L152 330 Q146 339 139 332Z"},
  {x:140,y:391,path:"M137 352 Q144 345 150 351 L148 434 Q141 444 136 435Z"},
];
const SIDE = [
  {x:173,y:292,path:"M91 311 Q181 281 276 235 L310 247 Q216 299 104 328Z"},
  {x:174,y:267,path:"M98 298 Q175 261 280 223 L303 232 Q206 278 98 310Z"},
  {x:227,y:260,path:"M202 274 Q205 232 232 235 Q250 241 248 253 L221 280Z"},
  {x:295,y:318,path:"M260 306 Q287 293 323 282 L326 319 Q296 339 270 337Z"},
  {x:369,y:297,path:"M337 279 Q367 271 395 273 L407 306 Q379 320 343 320Z"},
];
export function MouseVisual({selected,onSelect,color={r:8,g:253,b:212},mode=1,brightness=8,speed=3,onLed}: {
  selected?:number; onSelect?:(slot:number)=>void; color?:Rgb; mode?:number; brightness?:number; speed?:number; onLed?:()=>void;
}) {
  const id=useId().replace(/:/g,"");
  const [view,setView]=useState<"top"|"side">("top");
  const [wheel,setWheel]=useState(0);
  const [tilt,setTilt]=useState({x:0,y:0});
  const zones=view==="top"?TOP:SIDE;
  const style={"--mouse-led":`rgb(${color.r},${color.g},${color.b})`,"--led-speed":`${3.6-speed*.5}s`,"--led-opacity":mode===0?0:brightness/8} as CSSProperties;
  const led=view==="top"?"M305 331H321":"M402 264L416 267";
  return <div className="mouse-visual mouse-refined" style={style}>
    <div className="mouse-visual-heading"><span>ATTACK SHARK</span><b>X11</b><small>EXPLORA TU RATÓN</small></div>
    <div className="mouse-view-switch" role="group" aria-label="Vista del ratón">
      <button aria-pressed={view==="top"} onClick={()=>setView("top")}>Superior</button>
      <button aria-pressed={view==="side"} onClick={()=>setView("side")}>Lateral</button>
    </div>
    <svg className={`mouse-vector view-${view}`} viewBox="30 10 570 620" role="group" aria-label={`Attack Shark X11 vectorial: vista ${view==="top"?"superior":"lateral"}`}
      style={{transform:`perspective(900px) rotateX(${-tilt.y*5}deg) rotateY(${tilt.x*7}deg)`}}
      onPointerMove={event=>{const r=event.currentTarget.getBoundingClientRect();setTilt({x:(event.clientX-r.left)/r.width-.5,y:(event.clientY-r.top)/r.height-.5});}}
      onPointerLeave={()=>setTilt({x:0,y:0})}>
      <defs>
        <linearGradient id={`${id}-shell`}><stop stopColor="#101319"/><stop offset=".18" stopColor="#434950"/><stop offset=".38" stopColor="#252a30"/><stop offset=".67" stopColor="#14171d"/><stop offset=".89" stopColor="#3c4249"/><stop offset="1" stopColor="#0b0d12"/></linearGradient>
        <linearGradient id={`${id}-button`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#515860"/><stop offset=".35" stopColor="#30353c"/><stop offset="1" stopColor="#181c22"/></linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2=".3" y2="1"><stop stopColor="#50575f"/><stop offset=".45" stopColor="#22272e"/><stop offset="1" stopColor="#0c0f15"/></linearGradient>
        <radialGradient id={`${id}-halo`}><stop stopColor="#00f0ff" stopOpacity=".12"/><stop offset="1" stopColor="#00f0ff" stopOpacity="0"/></radialGradient>
        <pattern id={`${id}-grip`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${wheel%7})`}><path d="M0 1H45" stroke="#68717d" strokeWidth="1.4"/><path d="M0 3H45" stroke="#080a0e" strokeWidth="2"/></pattern>
        <clipPath id={`${id}-wheel`}><path d={zones[2].path}/></clipPath>
      </defs>
      <ellipse cx="313" cy="345" rx="260" ry="280" fill={`url(#${id}-halo)`}/>
      <g className="mouse-vector-body" key={view}>
        {view==="top"?<>
          <ellipse cx="313" cy="590" rx="165" ry="22" fill="#000" opacity=".4"/>
          <path d="M169 77 Q209 60 273 58 Q313 44 353 58 Q420 60 457 77 Q489 88 484 144 L473 334 Q477 395 483 476 Q493 554 427 593 Q377 620 313 621 Q248 620 199 593 Q133 554 143 476 Q149 395 153 334 L142 144 Q137 88 169 77Z" fill="#090c11" stroke="#4e5763" strokeWidth="2"/>
          <path d="M167 104 Q192 77 266 66 L360 66 Q435 77 459 104 L461 311 Q459 384 472 474 Q485 547 420 584 Q372 610 313 611 Q253 610 206 584 Q141 547 154 474 Q166 384 165 311Z" fill={`url(#${id}-shell)`}/>
          <path d="M295 61Q313 56 331 61V298H295Z" fill="#0b0e13"/>
          <path d="M169 332 Q163 433 161 475 Q157 524 180 551 M457 332 Q463 433 465 475 Q469 524 446 551" fill="none" stroke="#a4b0c0" strokeOpacity=".15" strokeWidth="2"/>
          <path d="M201 590Q313 639 427 590" fill="none" stroke="#6c7787" strokeOpacity=".25"/>
        </>:<>
          <ellipse cx="323" cy="460" rx="238" ry="24" fill="#000" opacity=".4"/>
          <path d="M86 330 Q108 312 161 292 Q234 248 289 228 Q373 192 443 248 Q493 288 550 406 Q561 439 524 446 L153 459 Q102 451 86 420Z" fill={`url(#${id}-shell)`} stroke="#626c79" strokeOpacity=".4" strokeWidth="2"/>
          <path d="M88 335Q212 310 314 257 Q385 220 449 271 Q503 318 542 412 Q412 435 174 446 L110 420Z" fill={`url(#${id}-side)`}/>
          <path d="M110 421 Q287 465 542 414 L528 439 Q325 473 145 452Z" fill="#090c11" stroke="#505c6a" strokeOpacity=".35"/>
          <path d="M103 375 L129 375 L130 390 L104 390Z" fill="#03050a" stroke="#737e8c" strokeWidth="2"/>
          <text x="278" y="384" fill="#778291" fontSize="17" fontWeight="700" letterSpacing="1">ATTACK SHARK</text>
        </>}
        {MOUSE_BUTTONS.map((button,index)=>{
          const zone=zones[index];return <g key={button.slot} className={`mouse-zone ${selected===button.slot?"selected":""}`}
            role={onSelect?"button":undefined} tabIndex={onSelect?0:undefined} aria-label={button.label}
            onClick={()=>onSelect?.(button.slot)} onWheel={button.slot===2?event=>setWheel(value=>value+(event.deltaY>0?2:-2)):undefined}
            onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect?.(button.slot);}}}>
            <title>{button.label}</title><path d={zone.path} fill={`url(#${id}-${button.slot>=6?"side":"button"})`}/>
            {button.slot===2&&<g className="mouse-wheel" clipPath={`url(#${id}-wheel)`}>
              <path d={zone.path} fill="#0a0c11"/><path d={zone.path} fill={`url(#${id}-grip)`}/>
              {view==="top"?<path d="M297 137V204M329 137V204" fill="none" stroke="#bcc5d0" strokeWidth="3"/>:<path d="M207 272Q210 234 233 239" fill="none" stroke="#bcc5d0" strokeWidth="3"/>}
            </g>}
            {onSelect&&<g className="mouse-pin" transform={`translate(${zone.x} ${zone.y})`}><circle r="14"/><text textAnchor="middle" dy="6">{index+1}</text></g>}
            <path className="mouse-hit-area" d={zone.path} fill="transparent" stroke="transparent" strokeWidth={button.slot>=6?18:4}/>
          </g>;
        })}
        <g className={`mouse-led mode-${mode}`} role={onLed?"button":undefined} tabIndex={onLed?0:undefined} aria-label="Configurar luz LED"
          onClick={onLed} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onLed?.();}}}>
          <title>Luz LED</title><path className="led-mask" d={led}/><path className="led-aura" d={led}/><path className="led-core" d={led}/><path d={led} stroke="transparent" strokeWidth="35"/>
        </g>
      </g>
    </svg>
    <div className="mouse-visual-foot"><span className="dot"/>{onSelect?"Pulsa una zona · Desplaza sobre la rueda":"Vista de tu iluminación"}</div>
  </div>;
}
