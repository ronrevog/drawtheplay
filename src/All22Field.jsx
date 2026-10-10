import {footballPose} from './footballAnimation.js';
import {playerFootAnchor,spriteFootPoint} from './playerFootAnchor.js';
import {playerSkinTone,materialColor} from './playerAppearance.js';
import {spriteFrame} from './tacklePlayback.js';
import {getPlayerSprites,loadPlayerSprites} from './playerSprites.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ballFollowCamera,all22Camera,broadcastCamera,broadcastPlayer,playerAnimation,spriteDirection} from './all22';
import {FieldAssignments} from './FieldAssignments.jsx';

// This optional local reference pack is deliberately excluded from Git/builds.
// The renderer also works without it, using the original pixel figures below.
const tintCache=new Map();
const footAnchors=new WeakMap();
function useReferenceSprites(){
 const [pack,setPack]=useState(getPlayerSprites);
 useEffect(()=>{let cancelled=false;loadPlayerSprites().then(value=>{if(!cancelled)setPack(value)});return()=>{cancelled=true}},[]);
 return pack;
}
function tintSprite(pack,s,palette,skin,opponent=palette,opponentSkin=skin){
 const key=[pack.sourceSha256,pack.materialChannels,s.image,palette.primary,palette.secondary,palette.tertiary,skin,opponent.primary,opponent.secondary,opponent.tertiary,opponentSkin].join('/');
 if(tintCache.has(key))return tintCache.get(key);
 const canvas=document.createElement('canvas');canvas.width=s.width;canvas.height=s.height;const c=canvas.getContext('2d');
 c.drawImage(pack.image,s.image%pack.columns*pack.cell,Math.floor(s.image/pack.columns)*pack.cell,s.width,s.height,0,0,s.width,s.height);
 const pixels=c.getImageData(0,0,s.width,s.height);
 footAnchors.set(canvas,playerFootAnchor(pixels.data,s.width,s.height));
 for(let i=0;i<pixels.data.length;i+=4){
  if(!pixels.data[i+3]||!pack.materialChannels||pixels.data[i+2]!==1)continue;
  const color=materialColor(pixels.data[i],pixels.data[i+1],palette,skin,opponent,opponentSkin);
  if(color)for(let j=0;j<3;j++)pixels.data[i+j]=color[j];
 }
 c.putImageData(pixels,0,0);if(tintCache.size>=2048)tintCache.delete(tintCache.keys().next().value);tintCache.set(key,canvas);return canvas;
}
function pixelPlayer(c,p,palette,t,scale,skin){
 const stride=Math.hypot(p.vx||0,p.vy||0)>.6?Math.round(Math.sin(t*13)*2):0;
 c.save();c.scale(scale,scale);c.fillStyle='#101621';c.fillRect(-5,-1,10,2);
 c.fillStyle=palette.secondary;c.fillRect(-4,-9,3,7+stride);c.fillRect(1,-9,3,7-stride);
 c.fillStyle='#131a22';c.fillRect(-5,-3+stride,4,2);c.fillRect(1,-3-stride,4,2);
 c.fillStyle=palette.primary;c.fillRect(-5,-17,10,9);c.fillRect(-7,-16,3,6-stride);c.fillRect(4,-16,3,6+stride);
 c.fillStyle=skin;c.fillRect(-7,-10-stride,3,3);c.fillRect(4,-10+stride,3,3);
 c.fillStyle=palette.primary;c.fillRect(-4,-23,8,7);c.fillStyle=palette.tertiary||'#ffffff';c.fillRect(-1,-23,2,6);
 c.fillStyle='#283744';c.fillRect(-3,-18,6,2);c.restore();
}
export function All22Field({simulation,frame,people,elapsed,colors,spot,distance,play,coach,inspected,active,home,offenseMode,defenseMode,defensePlan={},stroke,zoom=1,pan={x:0,y:0},onFieldDown,onFieldMove,onFieldUp,onFieldCancel,onReady,broadcast=false,hintText}){
 const terrain=useRef(null),canvas=useRef(null),hits=useRef([]),gesture=useRef(null),[size,setSize]=useState({width:640,height:700});const pack=useReferenceSprites();
 useEffect(()=>{const element=canvas.current;const observer=new ResizeObserver(([entry])=>{const {width,height}=entry.contentRect;if(width&&height)setSize({width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(height))})});observer.observe(element);return()=>observer.disconnect()},[]);
 const fittedCamera=useMemo(()=>(broadcast?broadcastCamera:all22Camera)(simulation.frames,size.width,size.height,{zoom,pan,spot}),[simulation,size.width,size.height,zoom,pan.x,pan.y,spot,broadcast]);
 const camera=active&&zoom>0?ballFollowCamera(fittedCamera,frame?.ball,size.width,size.height):(gesture.current?.camera||fittedCamera);
 useEffect(()=>{
  if(!frame||pack===undefined)return;const {width,height}=size;let c=terrain.current.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);c.fillStyle='#10281f';c.fillRect(0,0,width,height);
  const point=camera.point;
  function polygon(points,fill){c.beginPath();points.forEach(([x,y],i)=>{const p=point(x,y);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)});c.closePath();c.fillStyle=fill;c.fill()}
  function line(a,b,color,lineWidth=1){const p=point(...a),q=point(...b);c.strokeStyle=color;c.lineWidth=lineWidth;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke()}
  for(let yard=-10;yard<110;yard+=5){polygon([[0,yard-spot],[53.3,yard-spot],[53.3,yard+5-spot],[0,yard+5-spot]],yard<0?colors.offense.primary:yard>=100?colors.defense.primary:yard%10?'#285a3e':'#245238');if(yard>=0&&yard<=100){line([0,yard-spot],[53.3,yard-spot],'#8cae8b');if(yard%10===0&&yard>0&&yard<100){c.fillStyle='#e8edda';c.font=`900 ${camera.scale*1.9}px Arial Black, sans-serif`;c.textAlign='center';c.textBaseline='middle';for(const [x,rotation] of [[8,broadcast?Math.PI:Math.PI/2],[45.3,broadcast?0:-Math.PI/2]]){const p=point(x,yard-spot);c.save();c.translate(p.x,p.y);c.rotate(rotation);c.fillText(String(Math.min(yard,100-yard)),0,0);c.restore();if(yard!==50){const direction=yard<50?-1:1;const edge=c.measureText(String(Math.min(yard,100-yard))).width/(2*camera.scale)+.25;polygon([[x-.3,yard-spot+direction*edge],[x+.3,yard-spot+direction*edge],[x,yard-spot+direction*(edge+.5)]],'#e8edda')}}c.textAlign='start';c.textBaseline='alphabetic';}}}
  for(let yard=0;yard<=100;yard++)for(const x of [23.5,29.5])line([x,yard-spot],[x+.7,yard-spot],'#86a580');
  line([0,-10-spot],[0,110-spot],'#e5edcf',2);line([53.3,-10-spot],[53.3,110-spot],'#e5edcf',2);line([0,0],[53.3,0],'#78c9f7',2);
  if(!simulation.special)line([0,Math.min(distance,100-spot)],[53.3,Math.min(distance,100-spot)],'#efd174',2);
  // Uprights sit on the end lines, with elevation projected above the turf.
  for(const yard of [-10,110]){const base=point(26.65,yard-spot),half=3.08*camera.scale,cross=base.y-3.33*camera.scale,top=cross-6.7*camera.scale;
   c.save();c.lineCap='round';c.strokeStyle='#101d1c88';c.lineWidth=Math.max(2,camera.scale*.22);c.beginPath();c.moveTo(base.x,base.y);c.lineTo(base.x+camera.scale*2,base.y+camera.scale*2);c.stroke();
   c.strokeStyle='#ffda45';c.lineWidth=Math.max(2,camera.scale*.13);c.beginPath();c.moveTo(base.x,base.y);c.lineTo(base.x,cross);const left=point(23.57,yard-spot),right=point(29.73,yard-spot),lift=3.33*camera.scale,upright=6.7*camera.scale;c.moveTo(left.x,left.y-lift-upright);c.lineTo(left.x,left.y-lift);c.lineTo(right.x,right.y-lift);c.lineTo(right.x,right.y-lift-upright);c.stroke();
   c.strokeStyle='#244570';c.lineWidth=Math.max(4,camera.scale*.45);c.beginPath();c.moveTo(base.x,base.y);c.lineTo(base.x,base.y-camera.scale*1.7);c.stroke();c.restore();
  }
  if(coach&&!active)for(const b of frame.blocks||[]){const a=frame.players.find(p=>p.slot===b.blocker),d=frame.players.find(p=>p.slot===b.defender);if(a&&d)line([a.x,a.y],[d.x,d.y],'#ffcc81',2)}
  c=canvas.current.getContext('2d');c.clearRect(0,0,width,height);c.imageSmoothingEnabled=false;
  hits.current=[];const labels=[];const scale=Math.max(.45,Math.min(2,camera.scale/8));
  // The reference sprites are about 90 pixels tall, versus 23 for the
  // fallback figures. Keep their standing height near 3.75 field yards;
  // camera zoom then enlarges the field and artwork together.
  const spriteScale=camera.scale/(broadcast?32:24);
  const paired=frame.players.filter(p=>p.animationPartner&&pack?.byName[playerAnimation(p,frame.carrier)]?.paired);
  for(const p of [...frame.players].sort((a,b)=>point(a.x,a.y).y-point(b.x,b.y).y)){
   if(paired.some(owner=>owner.animationPartner.slot===p.slot&&owner.animationPartner.side===p.side))continue;
   const at=point(p.x,p.y),meta=people.find(m=>m.side===p.side&&m.slot===p.slot)||p,selected=inspected?.slot===p.slot&&inspected?.side===p.side;
   const ring=(foot,ringScale)=>{if(selected||p.slot===frame.carrier){c.strokeStyle=selected?'#ffffff':'#ffdf73';c.lineWidth=2;c.beginPath();c.ellipse(foot.x,foot.y,8*ringScale,3*ringScale,0,0,Math.PI*2);c.stroke()}};
   const animation=pack?.byName[playerAnimation(p,frame.carrier)],skin=playerSkinTone(meta);
   let labelY=at.y+14;
   if(animation){const index=['LMT3PT','LMT4PT'].includes(animation.name)?animation.frames-1:spriteFrame(p,elapsed,animation.frames),angle=spriteDirection(broadcast?broadcastPlayer(p):p,animation.directions),nativeRef=animation.references[angle*animation.frames+index],s=animation.sprites[nativeRef.sprite];
    const partner=p.animationPartner,partnerMeta=partner&&people.find(m=>m.side===partner.side&&m.slot===partner.slot);
    const art=tintSprite(pack,s,colors[p.side],skin,colors[partner?.side|| (p.side==='offense'?'defense':'offense')],partnerMeta?playerSkinTone(partnerMeta):skin);
    const foot=footAnchors.get(art),ref=['LMT3PT','LMT4PT','CTSNP'].includes(animation.name)?{...nativeRef,x:-(nativeRef.flags&2?s.width-foot.x:foot.x),y:-foot.y}:nativeRef;
    ring(spriteFootPoint(at,ref,s,footAnchors.get(art),spriteScale),camera.scale/8);
    c.save();c.translate(Math.round(at.x+ref.x*spriteScale),Math.round(at.y+ref.y*spriteScale-(p.celebrationLift||0)*camera.scale));if(ref.flags&2){c.translate(s.width*spriteScale,0);c.scale(-1,1)}c.drawImage(art,0,0,s.width*spriteScale,s.height*spriteScale);c.restore();
    hits.current.push({x:at.x+(ref.x+s.width/2)*spriteScale,y:at.y+(ref.y+s.height/2)*spriteScale,r:Math.max(12,Math.min(28,s.width*spriteScale/2)),player:{slot:p.slot,side:p.side}});
    labelY=at.y+(ref.y+s.height)*spriteScale+13;
   }else{ring({x:Math.round(at.x),y:Math.round(at.y)},scale);c.save();c.translate(Math.round(at.x),Math.round(at.y-(p.celebrationLift||0)*camera.scale));pixelPlayer(c,p,colors[p.side],elapsed,scale,skin);c.restore();hits.current.push({x:at.x,y:at.y-14*scale,r:Math.max(12,18*scale),player:{slot:p.slot,side:p.side}})}
   if(coach||selected||!active)labels.push({x:at.x,y:labelY,text:selected?meta.name:p.slot,selected});
  }
  // Screen-sized labels: never magnify them with the low-resolution sprite art.
  const occupied=[];c.font='600 11px system-ui';c.textAlign='center';
  for(const label of labels.sort((a,b)=>Number(b.selected)-Number(a.selected))){
   const w=c.measureText(label.text).width+8,box={left:label.x-w/2,right:label.x+w/2,top:label.y-11,bottom:label.y+3};
   if(!label.selected&&occupied.some(b=>box.left<b.right+3&&box.right>b.left-3&&box.top<b.bottom+2&&box.bottom>b.top-2))continue;
   occupied.push(box);c.fillStyle='#102017cc';c.fillRect(box.left,box.top,w,14);c.fillStyle=label.selected?'#ffffff':'#dce9dc';c.fillText(label.text,label.x,label.y);
  }c.textAlign='start';
  const carrier=frame.players.find(p=>p.slot===frame.carrier);
  const pose=footballPose(frame,simulation.frames,elapsed,!!(carrier&&pack?.byName[playerAnimation(carrier,frame.carrier)]));
  if(pose){
   const b=point(frame.ball.x,frame.ball.y),z=pose.height*camera.scale*.65,w=Math.max(3,camera.scale*.65),s=pack?.football;
   c.fillStyle='#0b1d1666';c.beginPath();c.ellipse(b.x,b.y,w*.4,w*.14,0,0,Math.PI*2);c.fill();
   c.save();c.translate(b.x,b.y-z);c.rotate(broadcast?Math.atan2(.62*Math.cos(pose.angle),Math.sin(pose.angle)+.13*Math.cos(pose.angle)):pose.angle);
   if(s){const h=w*s.height/s.width;c.drawImage(pack.image,(s.image%pack.columns)*pack.cell,Math.floor(s.image/pack.columns)*pack.cell,s.width,s.height,-w/2,-h/2,w,h)}
   else{c.fillStyle='#81452a';c.beginPath();c.ellipse(0,0,w/2,w*.28,0,0,Math.PI*2);c.fill();c.strokeStyle='#e9d8b7';c.lineWidth=Math.max(.5,w*.08);c.beginPath();c.moveTo(-w*.2,0);c.lineTo(w*.2,0);c.stroke()}
   c.restore();
  }
 },[frame,elapsed,camera,size,pack,colors,spot,distance,play,coach,inspected,people,simulation,active,home,defensePlan,stroke]);
 useEffect(()=>{onReady?.(pack!==undefined)},[pack,onReady]);
 function eventPoint(e){const rect=canvas.current.getBoundingClientRect(),x=(e.clientX-rect.left)*size.width/rect.width,y=(e.clientY-rect.top)*size.height/rect.height;return {x,y,event:{world:camera.world(x,y),button:e.button,pointerId:e.pointerId,currentTarget:e.currentTarget}}}
 function down(e){if(e.button>0||e.isPrimary===false||gesture.current)return;e.preventDefault();const {x,y,event}=eventPoint(e);gesture.current={camera,pointerId:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);const hit=hits.current.map(h=>({...h,d:Math.hypot(x-h.x,y-h.y)})).filter(h=>h.d<Math.max(h.r,e.pointerType==='touch'?24:h.r)).sort((a,b)=>a.d-b.d)[0];const player=hit&&frame.players.find(p=>p.slot===hit.player.slot&&p.side===hit.player.side);onFieldDown(event,player)}
 function up(e){if(gesture.current?.pointerId!==e.pointerId)return;onFieldMove(eventPoint(e).event);onFieldUp();gesture.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}
 function cancel(){gesture.current=null;onFieldCancel()}
 const hint=hintText??(simulation.special&&!active?'Special teams · Ready to kick':active?'Tap a player to inspect':home?offenseMode==='move'?'Drag offensive players · Keep at least 7 on the line':'Select or drag a player to draw their assignment':defenseMode==='man'?'Select an offensive player to cover':defenseMode?'Draw the '+defenseMode+' path':'Drag a defender to reposition · Select for Man, Zone or Blitz');
 return <div className="all22-field" aria-busy={pack===undefined}>{pack===undefined&&<div className="field-loading" role="status">Getting the field ready…</div>}<div className="all22-badge">{broadcast?'BROADCAST · 16:9':'ALL-22'} <span>{frame?.phase||'Live play'}</span></div><canvas ref={terrain} className="all22-terrain" width={size.width} height={size.height} aria-hidden="true"/><canvas ref={canvas} className="all22-players" width={size.width} height={size.height} onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} onPointerDown={down} onPointerMove={e=>{if(gesture.current?.pointerId===e.pointerId)onFieldMove(eventPoint(e).event)}} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={()=>{if(gesture.current)cancel()}} aria-label="Interactive football field with animated players. Select players to draw routes or move defenders." role="img"/><FieldAssignments camera={camera} size={size} play={play} frame={frame} active={active} special={simulation.special} home={home} coach={coach} selected={inspected} defensePlan={defensePlan} stroke={stroke} defenseMode={defenseMode}/><div className="all22-hint">{hint}</div></div>;
}
