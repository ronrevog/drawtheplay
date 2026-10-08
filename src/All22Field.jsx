import {spriteFrame} from './tacklePlayback.js';
import {getPlayerSprites,loadPlayerSprites} from './playerSprites.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {all22Camera,playerAnimation,spriteDirection} from './all22';
import {FieldAssignments} from './FieldAssignments.jsx';

// This optional local reference pack is deliberately excluded from Git/builds.
// The renderer also works without it, using the original pixel figures below.
const tintCache=new Map();
function useReferenceSprites(){
 const [pack,setPack]=useState(getPlayerSprites);
 useEffect(()=>{let cancelled=false;loadPlayerSprites().then(value=>{if(!cancelled)setPack(value)});return()=>{cancelled=true}},[]);
 return pack;
}
function tintAtlas(image,palette){
 const key=palette.primary+palette.secondary;if(tintCache.has(key))return tintCache.get(key);
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d');c.drawImage(image,0,0);
 const pixels=c.getImageData(0,0,canvas.width,canvas.height);
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const primary=rgb(palette.primary),secondary=rgb(palette.secondary);
 for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],a=pixels.data[i+3];if(!a)continue;let color,light;
  if(b>r*1.4&&b>g*1.2){color=primary;light=Math.max(.3,b/255)}
  else if(g>r*1.3&&g>b*1.3){color=primary;light=Math.max(.3,g/220)}
  else if(r>80&&r>g*1.6&&r>b*1.6){color=secondary;light=r/255}
  else if(r>85&&g>85&&b<Math.min(r,g)*.5&&Math.abs(r-g)<45){color=secondary;light=Math.max(r,g)/255}
  else if(Math.max(r,g,b)-Math.min(r,g,b)<20&&r>90){color=secondary;light=r/255}
  if(color)for(let j=0;j<3;j++)pixels.data[i+j]=Math.round(color[j]*light);
 }c.putImageData(pixels,0,0);if(tintCache.size>=4)tintCache.delete(tintCache.keys().next().value);tintCache.set(key,canvas);return canvas;
}
function pixelPlayer(c,p,palette,t,scale){
 const stride=Math.hypot(p.vx||0,p.vy||0)>.6?Math.round(Math.sin(t*13)*2):0;
 c.save();c.scale(scale,scale);c.fillStyle='#101621';c.fillRect(-5,-1,10,2);
 c.fillStyle=palette.secondary;c.fillRect(-4,-9,3,7+stride);c.fillRect(1,-9,3,7-stride);
 c.fillStyle='#131a22';c.fillRect(-5,-3+stride,4,2);c.fillRect(1,-3-stride,4,2);
 c.fillStyle=palette.primary;c.fillRect(-5,-17,10,9);c.fillRect(-7,-16,3,6-stride);c.fillRect(4,-16,3,6+stride);
 c.fillStyle='#ad8060';c.fillRect(-7,-10-stride,3,3);c.fillRect(4,-10+stride,3,3);
 c.fillStyle=palette.secondary;c.fillRect(-4,-23,8,7);c.fillStyle=palette.primary;c.fillRect(-1,-23,2,6);
 c.fillStyle='#283744';c.fillRect(-3,-18,6,2);c.restore();
}
export function All22Field({simulation,frame,people,elapsed,colors,spot,distance,play,coach,inspected,active,home,offenseMode,defenseMode,defensePlan={},stroke,zoom=1,pan={x:0,y:0},onFieldDown,onFieldMove,onFieldUp,onFieldCancel,onReady}){
 const terrain=useRef(null),canvas=useRef(null),hits=useRef([]),gesture=useRef(null),[size,setSize]=useState({width:640,height:700});const pack=useReferenceSprites();
 useEffect(()=>{const element=canvas.current;const observer=new ResizeObserver(([entry])=>{const {width,height}=entry.contentRect;if(width&&height)setSize({width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(height))})});observer.observe(element);return()=>observer.disconnect()},[]);
 const fittedCamera=useMemo(()=>all22Camera(simulation.frames,size.width,size.height,{zoom,pan,spot}),[simulation,size.width,size.height,zoom,pan.x,pan.y,spot]);
 const camera=gesture.current?.camera||fittedCamera;
 const tinted=useMemo(()=>pack?{offense:tintAtlas(pack.image,colors.offense),defense:tintAtlas(pack.image,colors.defense)}:null,[pack,colors.offense.primary,colors.offense.secondary,colors.defense.primary,colors.defense.secondary]);
 useEffect(()=>{
  if(!frame||pack===undefined)return;const {width,height}=size;let c=terrain.current.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);c.fillStyle='#10281f';c.fillRect(0,0,width,height);
  const point=camera.point;
  function polygon(points,fill){c.beginPath();points.forEach(([x,y],i)=>{const p=point(x,y);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)});c.closePath();c.fillStyle=fill;c.fill()}
  function line(a,b,color,lineWidth=1){const p=point(...a),q=point(...b);c.strokeStyle=color;c.lineWidth=lineWidth;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke()}
  for(let yard=-10;yard<110;yard+=5){polygon([[0,yard-spot],[53.3,yard-spot],[53.3,yard+5-spot],[0,yard+5-spot]],yard<0?colors.offense.primary:yard>=100?colors.defense.primary:yard%10?'#285a3e':'#245238');if(yard>=0&&yard<=100){line([0,yard-spot],[53.3,yard-spot],'#8cae8b');if(yard%10===0&&yard>0&&yard<100){c.fillStyle='#d4dfc5';c.font='bold 10px monospace';for(const x of [5,46]){const p=point(x,yard-spot);c.fillText(String(Math.min(yard,100-yard)),p.x,p.y-3)}}}}
  for(let yard=0;yard<=100;yard++)for(const x of [23.5,29.5])line([x,yard-spot],[x+.7,yard-spot],'#86a580');
  line([0,-10-spot],[0,110-spot],'#e5edcf',2);line([53.3,-10-spot],[53.3,110-spot],'#e5edcf',2);line([0,0],[53.3,0],'#78c9f7',2);
  if(!simulation.special)line([0,Math.min(distance,100-spot)],[53.3,Math.min(distance,100-spot)],'#efd174',2);
  if(coach&&!active)for(const b of frame.blocks||[]){const a=frame.players.find(p=>p.slot===b.blocker),d=frame.players.find(p=>p.slot===b.defender);if(a&&d)line([a.x,a.y],[d.x,d.y],'#ffcc81',2)}
  c=canvas.current.getContext('2d');c.clearRect(0,0,width,height);c.imageSmoothingEnabled=false;
  hits.current=[];const labels=[];const scale=Math.max(.45,Math.min(2,camera.scale/8));
  for(const p of [...frame.players].sort((a,b)=>point(a.x,a.y).y-point(b.x,b.y).y)){
   const at=point(p.x,p.y),meta=people.find(m=>m.side===p.side&&m.slot===p.slot)||p,selected=inspected?.slot===p.slot&&inspected?.side===p.side;
   if(selected||p.slot===frame.carrier){c.strokeStyle=selected?'#ffffff':'#ffdf73';c.lineWidth=2;c.beginPath();c.ellipse(at.x,at.y,8*scale,3*scale,0,0,Math.PI*2);c.stroke()}
   const animation=pack?.byName[playerAnimation(p,frame.carrier)];
   if(animation){const index=spriteFrame(p,elapsed,animation.frames),angle=spriteDirection(p,animation.directions),ref=animation.references[angle*animation.frames+index],s=animation.sprites[ref.sprite];
    c.save();c.translate(Math.round(at.x+ref.x*scale),Math.round(at.y+ref.y*scale));if(ref.flags&2){c.translate(s.width*scale,0);c.scale(-1,1)}c.drawImage(tinted[p.side],s.image%pack.columns*pack.cell,Math.floor(s.image/pack.columns)*pack.cell,s.width,s.height,0,0,s.width*scale,s.height*scale);c.restore();
   }else{c.save();c.translate(Math.round(at.x),Math.round(at.y));pixelPlayer(c,p,colors[p.side],elapsed,scale);c.restore()}
   hits.current.push({x:at.x,y:at.y-14*scale,r:Math.max(12,18*scale),player:{slot:p.slot,side:p.side}});
   if(coach||selected||!active)labels.push({x:at.x,y:at.y+14,text:selected?meta.name:p.slot,selected});
  }
  // Screen-sized labels: never magnify them with the low-resolution sprite art.
  const occupied=[];c.font='600 11px system-ui';c.textAlign='center';
  for(const label of labels.sort((a,b)=>Number(b.selected)-Number(a.selected))){
   const w=c.measureText(label.text).width+8,box={left:label.x-w/2,right:label.x+w/2,top:label.y-11,bottom:label.y+3};
   if(!label.selected&&occupied.some(b=>box.left<b.right+3&&box.right>b.left-3&&box.top<b.bottom+2&&box.bottom>b.top-2))continue;
   occupied.push(box);c.fillStyle='#102017cc';c.fillRect(box.left,box.top,w,14);c.fillStyle=label.selected?'#ffffff':'#dce9dc';c.fillText(label.text,label.x,label.y);
  }c.textAlign='start';
  if(frame.ball){const b=point(frame.ball.x,frame.ball.y),z=Math.max(0,frame.ball.z||0)*camera.scale*.65;c.fillStyle='#0b1d16';c.beginPath();c.ellipse(b.x,b.y,3,1.5,0,0,Math.PI*2);c.fill();c.fillStyle='#b66d32';c.fillRect(b.x-2,b.y-z-6,4,8);if(Math.floor(elapsed*16)%2===0){c.fillStyle='#fff1d0';c.fillRect(b.x-1,b.y-z-4,2,4)}}
 },[frame,elapsed,camera,size,pack,tinted,colors,spot,distance,play,coach,inspected,people,simulation.special,active,home,defensePlan,stroke]);
 useEffect(()=>{onReady?.(pack!==undefined)},[pack,onReady]);
 function eventPoint(e){const rect=canvas.current.getBoundingClientRect(),x=(e.clientX-rect.left)*size.width/rect.width,y=(e.clientY-rect.top)*size.height/rect.height;return {x,y,event:{world:camera.world(x,y),button:e.button,pointerId:e.pointerId,currentTarget:e.currentTarget}}}
 function down(e){if(e.button>0)return;const {x,y,event}=eventPoint(e);gesture.current={camera,pointerId:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);const hit=hits.current.map(h=>({...h,d:Math.hypot(x-h.x,y-h.y)})).filter(h=>h.d<h.r).sort((a,b)=>a.d-b.d)[0];const player=hit&&frame.players.find(p=>p.slot===hit.player.slot&&p.side===hit.player.side);onFieldDown(event,player)}
 function up(e){if(gesture.current?.pointerId!==e.pointerId)return;onFieldUp();gesture.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}
 function cancel(){gesture.current=null;onFieldCancel()}
 const hint=simulation.special&&!active?'Special teams · Ready to kick':active?'Tap a player to inspect':home?offenseMode==='move'?'Drag offensive players · Keep at least 7 on the line':'Select or drag a player to draw their assignment':defenseMode==='man'?'Select an offensive player to cover':defenseMode?'Draw the '+defenseMode+' path':'Drag a defender to reposition · Select for Man, Zone or Blitz';
 return <div className="all22-field" aria-busy={pack===undefined}>{pack===undefined&&<div className="field-loading" role="status">Getting the field ready…</div>}<div className="all22-badge">ALL-22 <span>{frame?.phase||'Live play'}</span></div><canvas ref={terrain} className="all22-terrain" width={size.width} height={size.height} aria-hidden="true"/><canvas ref={canvas} className="all22-players" width={size.width} height={size.height} onPointerDown={down} onPointerMove={e=>{if(gesture.current?.pointerId===e.pointerId)onFieldMove(eventPoint(e).event)}} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={()=>{if(gesture.current)cancel()}} aria-label="Interactive football field with animated players. Select players to draw routes or move defenders." role="img"/><FieldAssignments camera={camera} size={size} play={play} frame={frame} active={active} special={simulation.special} home={home} coach={coach} selected={inspected} defensePlan={defensePlan} stroke={stroke} defenseMode={defenseMode}/><div className="all22-hint">{hint}</div></div>;
}
