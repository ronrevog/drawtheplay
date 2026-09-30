import React from 'react';

// Toggle centered laces using the replay clock so pause and speed stay in sync.
export function Football({x,y,height=0,time=0,inFlight=false}){
 const angle=inFlight?time*Math.PI*12:0;
 const lacesVisible=Math.cos(angle)>=0;
 const laces=()=><g stroke="#fff4da" strokeWidth=".1" strokeLinecap="round"><path d="M0 -.37V.37"/>{[-.27,-.09,.09,.27].map(v=><path key={v} d={`M-.16 ${v}H.16`}/>)}</g>;
 return <g className="live-football" pointerEvents="none">
  <ellipse cx={x+.3} cy={y+.4} rx=".48" ry=".8" fill="#0005"/>
  <g transform={`translate(${x} ${y-height*.35})`}>
   <path d="M0 -.85C.64 -.5 .64 .5 0 .85C-.64 .5 -.64 -.5 0 -.85Z" fill="#a95526" stroke="#fff0d0" strokeWidth=".12"/>
   <path d="M-.1 -.69C-.43 -.3 -.43 .3 -.1 .69" fill="none" stroke="#e29453" strokeWidth=".1" opacity=".7"/>
   <g className="football-spiral" opacity={lacesVisible?1:0}>{laces()}</g>
   <g className="football-still-laces">{laces()}</g>
  </g>
 </g>;
}
