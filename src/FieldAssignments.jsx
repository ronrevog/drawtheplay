import {offensiveAlignment} from './playbook.js';
import React,{useId} from 'react';
import {worldPoint,LINE,blockType} from './liveSimulation';

// Keep playbook ink in SVG so it stays crisp over the pixel-art players.
export function FieldAssignments({camera,size,play,frame,active,special,home,coach,selected,defensePlan,stroke,defenseMode}){
 const id=useId().replaceAll(':','');
 if(active||special)return null;
 function route(points,{color='#c9ed9a',block=false,arrow=true,dashed=false,key,chosen=false,opacity=1}={}){
  if(points.length<2)return null;
  const ps=points.map(p=>camera.point(p.x,p.y)),end=ps.at(-1),previous=[...ps].reverse().find(p=>Math.hypot(p.x-end.x,p.y-end.y)>.5);
  if(!previous)return null;
  const d=ps.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' '),dx=end.x-previous.x,dy=end.y-previous.y,length=Math.hypot(dx,dy),half=Math.max(4,Math.min(6,camera.scale*.8));
  const bar=block?`M${end.x-dy/length*half} ${end.y+dx/length*half} L${end.x+dy/length*half} ${end.y-dx/length*half}`:null;
  return <g key={key} opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
   <path d={d} stroke="#10251d" strokeWidth={chosen?6:5} strokeOpacity=".75" vectorEffect="non-scaling-stroke"/>
   <path d={d} stroke={color} strokeWidth={chosen?3:2.3} strokeDasharray={dashed?'6 4':undefined} vectorEffect="non-scaling-stroke" markerEnd={!block&&arrow?`url(#route-arrow-${id})`:undefined}/>
   {bar&&<><path d={bar} stroke="#10251d" strokeWidth="6" vectorEffect="non-scaling-stroke"/><path d={bar} stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke"/></>}
  </g>;
 }
 return <svg className="field-assignment-ink" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true">
  <defs><marker id={`route-arrow-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 L3 5 Z" fill="context-stroke" stroke="context-stroke" strokeLinejoin="round"/></marker></defs>
  {home&&Object.entries(play?.routes||{}).map(([slot,pts])=>route([offensiveAlignment(play).find(p=>p[0]===slot)?.slice(1)||pts[0],...pts.slice(1)].map(worldPoint),{key:slot,block:LINE.includes(slot),dashed:LINE.includes(slot),chosen:selected?.slot===slot,color:LINE.includes(slot)?blockType(play,slot)==='Run block'?'#ffba78':'#9dd9ff':slot===(play.reads?.[0]||play.target)?'#ff5252':'#b5de91',opacity:selected&&selected.slot!==slot?.5:1}))}
  {!active&&!home&&Object.entries(defensePlan).map(([slot,a])=>{
   const player=frame.players.find(p=>p.side==='defense'&&p.slot===slot),target=frame.players.find(p=>p.side==='offense'&&p.slot===a.target);if(!player)return null;
   const pts=a.type==='man'&&target?[player,target]:a.path?.length?[player,...a.path.slice(1)]:[],end=pts.at(-1),center=end&&camera.point(end.x,end.y);
   return <g key={slot}>{route(pts,{color:a.type==='man'?'#fbc563':a.type==='blitz'?'#ff9188':'#79e3ff',arrow:a.type==='blitz',dashed:a.type==='man',chosen:selected?.slot===slot})}{a.type==='zone'&&center&&<circle cx={center.x} cy={center.y} r={camera.scale*6} fill="#73dfff22" stroke="#79e3ff" strokeWidth="2" vectorEffect="non-scaling-stroke"/>}</g>;
  })}
  {stroke&&route(home?stroke.map(worldPoint):stroke,{color:'#ffffff',chosen:true,block:home&&LINE.includes(selected?.slot),arrow:home||defenseMode==='blitz'})}
 </svg>;
}
