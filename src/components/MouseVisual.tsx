// SPDX-License-Identifier: GPL-3.0-or-later
import { useId, useState, type CSSProperties } from "react";
import type { Rgb } from "../lib/api";

export const MOUSE_BUTTONS = [
  {slot:0,label:"Clic izquierdo"}, {slot:1,label:"Clic derecho"},
  {slot:2,label:"Clic central · rueda"}, {slot:6,label:"Lateral delantero"},
  {slot:7,label:"Lateral trasero"},
];
// Contours follow the supplied straight-on X11 reference (1600 px canvas).
const TOP = [
  {x:610,y:470,path:"M440 126 Q443 114 455 109 L728 3 Q739 -2 741 13 L744 218 Q739 232 739 265 L739 423 Q739 451 759 459 L795 461 L795 765 L500 765 Q454 765 448 715 Q431 479 437 271Z"},
  {x:988,y:470,path:"M861 13 Q861 -1 875 3 L1148 113 Q1158 117 1159 133 Q1170 409 1152 699 Q1149 765 1100 767 L802 765 L802 461 L838 458 Q859 450 859 425 L859 263 Q859 230 853 218Z"},
  {x:799,y:330,path:"M753 224 Q797 207 845 223 L845 436 Q800 461 753 443Z"},
  {x:420,y:648,path:"M419 539 Q409 547 410 575 L411 739 L430 753 L433 724 L429 550Z"},
  {x:419,y:895,path:"M424 785 L411 796 Q404 871 405 944 L412 982 Q417 1002 433 1006 L438 981 L435 805Z"},
];
const SIDE = [
  {x:582,y:338,path:"M368 177 Q392 172 477 191 L543 211 Q590 199 638 237 L686 258 Q789 286 918 345 L729 474 Q682 507 644 489 L288 316 Q283 291 303 255 L346 190 Q353 177 368 177Z"},
  {x:806,y:232,path:"M432 144 Q521 153 662 123 Q695 120 721 137 Q911 192 1034 303 L924 342 Q801 279 729 244 Q706 188 638 174 Q587 160 541 187 L437 163Z"},
  {x:637,y:211,path:"M549 204 Q586 169 628 176 Q680 183 725 240 L687 258 Q650 213 614 203 Q579 193 549 211Z"},
  {x:611,y:512,path:"M545 453 Q593 482 680 529 L650 576 Q609 563 568 529 Q546 511 543 477Z"},
  {x:749,y:622,path:"M704 551 Q768 602 817 657 Q832 680 797 687 Q773 694 753 677 L683 604Z"},
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
  const led=view==="top"?"M780 813H817":"M939 370L953 362";
  return <div className="mouse-visual mouse-refined" style={style}>
    <div className="mouse-visual-heading"><span>ATTACK SHARK</span><b>X11</b><small>EXPLORA TU RATÓN</small></div>
    <div className="mouse-view-switch" role="group" aria-label="Vista del ratón">
      <button aria-pressed={view==="top"} onClick={()=>setView("top")}>Superior</button>
      <button aria-pressed={view==="side"} onClick={()=>setView("side")}>Perspectiva</button>
    </div>
    <svg className={`mouse-vector view-${view}`} viewBox={view==="top"?"265 -65 1070 1740":"200 70 1250 1050"} role="group" aria-label={`Attack Shark X11 vectorial: vista ${view==="top"?"superior":"perspectiva"}`}
      style={{transform:`perspective(900px) rotateX(${-tilt.y*2}deg) rotateY(${tilt.x*3}deg)`}}
      onPointerMove={event=>{const r=event.currentTarget.getBoundingClientRect();setTilt({x:(event.clientX-r.left)/r.width-.5,y:(event.clientY-r.top)/r.height-.5});}}
      onPointerLeave={()=>setTilt({x:0,y:0})}>
      <defs>
        <linearGradient id={`${id}-shell`}><stop stopColor="#161719"/><stop offset=".1" stopColor="#3a3b3d"/><stop offset=".23" stopColor="#252628"/><stop offset=".48" stopColor="#101113"/><stop offset=".72" stopColor="#1b1c1e"/><stop offset=".9" stopColor="#38393b"/><stop offset="1" stopColor="#161719"/></linearGradient>
        <linearGradient id={`${id}-button`} x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#454648"/><stop offset=".35" stopColor="#343537"/><stop offset=".75" stopColor="#28292b"/><stop offset="1" stopColor="#1d1e20"/></linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2=".3" y2="1"><stop stopColor="#505154"/><stop offset=".45" stopColor="#292a2d"/><stop offset="1" stopColor="#101113"/></linearGradient>
        <linearGradient id={`${id}-rim`}><stop stopColor="#6d6f71"/><stop offset=".18" stopColor="#e9eaeb"/><stop offset=".45" stopColor="#f5f6f7"/><stop offset=".8" stopColor="#777a7c"/><stop offset="1" stopColor="#d5d8da"/></linearGradient>
        <radialGradient id={`${id}-crown`} cx=".47" cy=".14" rx=".6" r=".8"><stop stopColor="#7b7c7e" stopOpacity=".15"/><stop offset=".65" stopColor="#060708" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".6"/></radialGradient>
        <radialGradient id={`${id}-halo`}><stop stopColor="#8aa1b9" stopOpacity=".08"/><stop offset="1" stopColor="#8aa1b9" stopOpacity="0"/></radialGradient>
        <pattern id={`${id}-grip`} width={view==="top"?100:9} height={view==="top"?10:7} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${wheel%10})`}><path d={view==="top"?"M0 8Q45 8 100 0":"M0 1H45"} fill="none" stroke="#77797b" strokeWidth={view==="top"?1.5:1.4}/><path d={view==="top"?"M0 11Q45 11 100 3":"M0 3H45"} fill="none" stroke="#08090a" strokeWidth="3"/></pattern>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="11"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".018"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="soft-light"/></filter>
        <clipPath id={`${id}-wheel`}><path d={zones[2].path}/></clipPath>
      </defs>
      <ellipse cx={view==="top"?800:800} cy={view==="top"?800:550} rx={view==="top"?510:620} ry={view==="top"?820:530} fill={`url(#${id}-halo)`}/>
      <g className="mouse-vector-body" key={view}>
        {view==="top"?<>
          <ellipse cx="800" cy="1560" rx="340" ry="53" fill="#000" opacity=".25"/>
          <path d="M437 122 Q409 144 412 223 L422 539 L419 766 Q406 958 402 1148 Q388 1300 453 1419 Q561 1596 796 1601 Q1030 1605 1140 1428 Q1208 1319 1194 1158 L1175 788 Q1170 657 1180 430 L1189 203 Q1193 145 1166 123 L1159 697 Q1155 770 1100 773 L500 773 Q450 770 443 717Z" fill={`url(#${id}-shell)`} stroke="#555658" strokeWidth="2"/>
          <path d="M437 122 Q409 144 412 223 L422 539 L419 766 Q406 958 402 1148 Q388 1300 453 1419 Q561 1596 796 1601 Q1030 1605 1140 1428 Q1208 1319 1194 1158 L1175 788 Q1170 657 1180 430 L1189 203 Q1193 145 1166 123 L1159 697 Q1155 770 1100 773 L500 773 Q450 770 443 717Z" fill={`url(#${id}-crown)`}/>
          <path d="M746 76Q799 59 853 76L853 221Q800 197 745 221Z" fill="#101112"/>
          <path d="M749 80V204M850 80V204" stroke="#77787a" strokeOpacity=".28" strokeWidth="3"/>
          <path d="M435 130Q424 390 440 539M1166 135Q1180 401 1161 691" fill="none" stroke="#d7d8da" strokeOpacity=".22" strokeWidth="3"/>
          <path d="M489 1447Q799 1735 1110 1444" fill="none" stroke="#727375" strokeOpacity=".1" strokeWidth="4"/>
        </>:<>
          <ellipse cx="875" cy="1005" rx="436" ry="48" fill="#000" opacity=".24"/>
          <path d="M288 313 L365 180 L432 143 L664 123 Q809 147 1035 304 Q1206 424 1302 664 Q1380 857 1358 943 Q1344 1016 1237 1032 Q1067 1057 901 966 Q771 895 660 791 L361 510 Q310 461 300 409Z" fill={`url(#${id}-shell)`} stroke="#626467" strokeWidth="3"/>
          <path d="M288 316 L652 492 Q679 510 730 478 L922 344 Q1084 406 1203 589 Q1296 739 1359 913 Q1366 974 1310 1005 Q1132 1098 906 967 Q775 892 658 785 L364 509 Q309 460 300 409Z" fill={`url(#${id}-side)`}/>
          <path d="M923 345 Q981 312 1035 309 Q1207 430 1302 664 Q1371 837 1359 936 Q1341 1019 1237 1032 Q1068 1057 901 966 Q814 920 741 861 Q674 741 651 627 Q635 548 657 495 Q686 502 730 478Z" fill={`url(#${id}-shell)`}/>
          <path d="M923 345 Q981 312 1035 309 Q1207 430 1302 664 Q1371 837 1359 936 Q1341 1019 1237 1032 Q1068 1057 901 966 Q814 920 741 861 Q674 741 651 627 Q635 548 657 495 Q686 502 730 478Z" fill={`url(#${id}-crown)`}/>
          <path d="M364 510Q465 607 657 786Q789 911 905 971Q1118 1081 1280 1024" fill="none" stroke="#a1a4a7" strokeOpacity=".23" strokeWidth="3"/>
          <text transform="translate(380 468) rotate(36)" fill="#929598" fontSize="30" fontWeight="800" fontStyle="italic" letterSpacing="-1">ATTACK SHARK</text>
        </>}
        {MOUSE_BUTTONS.map((button,index)=>{
          const zone=zones[index];return <g key={button.slot} className={`mouse-zone ${selected===button.slot?"selected":""}`}
            role={onSelect?"button":undefined} tabIndex={onSelect?0:undefined} aria-label={button.label}
            onClick={()=>onSelect?.(button.slot)} onWheel={button.slot===2?event=>setWheel(value=>value+(event.deltaY>0?2:-2)):undefined}
            onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect?.(button.slot);}}}>
            <title>{button.label}</title><path filter={view==="top"&&button.slot<2?`url(#${id}-grain)`:undefined} d={zone.path} fill={`url(#${id}-${button.slot>=6?"side":"button"})`}/>
            {button.slot===2&&<g className="mouse-wheel" clipPath={`url(#${id}-wheel)`}>
              <path d={zone.path} fill="#0a0c11"/><path d={zone.path} fill={`url(#${id}-grip)`}/>
              {view==="top"?<><path d="M756 226Q748 324 756 442M841 225Q849 332 841 438" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="13"/><path d="M767 225Q800 216 833 223M768 445Q800 453 832 441" fill="none" stroke="#a2a4a6" strokeOpacity=".4" strokeWidth="2"/></>:<path d="M550 207Q607 165 686 255" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="12"/>}
            </g>}
            {onSelect&&<g className="mouse-pin" transform={`translate(${zone.x} ${zone.y})`}><circle r={view==="top"?30:24}/><text textAnchor="middle" dy={view==="top"?10:8}>{index+1}</text></g>}
            <path className="mouse-hit-area" d={zone.path} fill="transparent" stroke="transparent" style={{strokeWidth:view==="top"?(button.slot>=6?35:5):(button.slot===2?35:button.slot>=6?18:4)}}/>
          </g>;
        })}
        <g className={`mouse-led mode-${mode}`} role={onLed?"button":undefined} tabIndex={onLed?0:undefined} aria-label="Configurar luz LED"
          onClick={onLed} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onLed?.();}}}>
          <title>Luz LED</title><path className="led-mask" d={led}/><path className="led-aura" d={led}/><path className="led-core" d={led}/><path d={led} stroke="transparent" strokeWidth={view==="top"?75:35}/>
        </g>
      </g>
    </svg>
    <div className="mouse-visual-foot"><span className="dot"/>{onSelect?"Pulsa una zona · Desplaza sobre la rueda":"Vista de tu iluminación"}</div>
  </div>;
}
