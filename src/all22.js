// Straight overhead field: parallel sidelines and perpendicular yard lines.
export function projectYards(x,y){return {x,y:-y}}
export function all22Camera(frames,width,height,{zoom=1,pan={x:0,y:0},spot=25}={}){
 const points=frames.flatMap(f=>[...(f.players||[]),...(f.ball?[f.ball]:[])]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 const low=zoom===0?-spot-14:Math.min(-8,...points.map(p=>p.y))-5,high=zoom===0?122-spot:Math.max(18,...points.map(p=>p.y))+7;
 const tight=width<=600&&zoom!==0;
 const left=tight?0:-3,right=tight?53.3:56.3;
 const corners=[projectYards(left,low),projectYards(right,low),projectYards(left,high),projectYards(right,high)];
 const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x)),minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
 const scale=Math.max(.1,Math.min((width-(tight?8:48))/(maxX-minX),(height-96)/(maxY-minY)))*([1,1,1.5,2.1][zoom]||1);
 const cx=(minX+maxX)/2+(zoom===0?0:pan.x||0),cy=(minY+maxY)/2+(zoom===0?0:pan.y||0);
 return {scale,low,high,point:(x,y)=>{const p=projectYards(x,y);return {x:width/2+(p.x-cx)*scale,y:height/2+20+(p.y-cy)*scale}},world:(x,y)=>({x:(x-width/2)/scale+cx,y:-((y-height/2-20)/scale+cy)})};
}
export function playerAnimation(p,carrier){
 const s=p.status||'',moving=Math.hypot(p.vx||0,p.vy||0)>.6;
 if((s==='Set'||!s)&&!moving){if(p.slot==='C')return 'CTSNP';if(['LT','LG','RG','RT'].includes(p.slot))return 'LMT3PT';if(p.side==='defense'?(p.position?p.position==='DL':['DE1','DT1','DT2','DE2'].includes(p.slot)):false)return 'LMT4PT';}
 if(s==='Interception catch')return 'SKCTHM';
 if(s==='Recovery')return 'FCATCH';
 if(s==='Tackling')return 'SKDIVE';
 if(s==='Tackled')return 'L2BSIDL';
 if(p.slot==='QB'&&(s==='Set'||!s)&&!moving)return 'QBSCHK';
 if(s==='Throwing')return 'QBBULIT';
 if(s==='Mesh')return 'QBHAND';
 if(s==='Dropback')return 'QBFADE';
 if(/Protecting|Driving|Engaged|Pass set|Run fit/.test(s))return 'LMSTAND';
 if(moving)return p.slot===carrier?'RBRNWB':p.slot==='QB'?'QBRUN':'SKRUN';
 return p.slot==='QB'?'QBPSET':p.side==='defense'?'DBREADY':'RCSTAND';
}
export function spriteDirection(p,count){
 if(count===1)return 0;
 const vx=p.vx||0,vy=p.vy||0;
 const heading=p.animationHeading??(p.status==='Dropback'?0:undefined)??(Math.hypot(vx,vy)>.3?Math.atan2(vx,vy):p.side==='defense'?Math.PI:0);
 return (Math.round(-heading/(Math.PI*2)*count)+count)%count;
}

// Sideline projection: downfield runs horizontally; the far sideline recedes.
export function broadcastCamera(frames,width,height,{zoom=1,pan={x:0,y:0},spot=25}={}){
 const points=frames.flatMap(f=>[...(f.players||[]),...(f.ball?[f.ball]:[])]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 const low=zoom===0?-spot-14:Math.min(-8,...points.map(p=>p.y))-6,high=zoom===0?114-spot:Math.max(18,...points.map(p=>p.y))+8;
 const project=(x,y)=>({x:-y+.13*(x-26.65),y:-x*.62});
 const corners=[project(-4,low),project(57.3,low),project(-4,high),project(57.3,high)];
 const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),scale=Math.max(.1,Math.min((width-40)/(Math.max(...xs)-Math.min(...xs)),(height-60)/(Math.max(...ys)-Math.min(...ys))))*([1,1,1.4,1.8][zoom]||1);
 const offset=project(26.65+(zoom?pan.x:0),zoom?pan.y:0),cx=(Math.min(...xs)+Math.max(...xs))/2+offset.x,cy=(Math.min(...ys)+Math.max(...ys))/2+(offset.y+26.65*.62);
 return {scale,low,high,broadcast:true,point:(x,y)=>{const p=project(x,y);return {x:width/2+(p.x-cx)*scale,y:height/2+10+(p.y-cy)*scale}},world:(x,y)=>{const py=(y-height/2-10)/scale+cy,wx=-py/.62,px=(x-width/2)/scale+cx;return {x:wx,y:-px+.13*(wx-26.65)}}};
}
export function broadcastPlayer(p){const heading=p.animationHeading??(p.status==='Dropback'?0:undefined)??(Math.hypot(p.vx||0,p.vy||0)>.3?undefined:p.side==='defense'?Math.PI:0);return {...p,vx:-(p.vy||0)+.13*(p.vx||0),vy:.62*(p.vx||0),animationHeading:heading===undefined?undefined:Math.atan2(-Math.cos(heading)+.13*Math.sin(heading),.62*Math.sin(heading))};}

// Translate the entire projection, including its pointer inverse, without changing
// zoom. Follow the airborne ball as well as its position along the ground.
export function ballFollowCamera(camera,ball,width,height,heightScale=.65){
 if(!Number.isFinite(ball?.x)||!Number.isFinite(ball?.y))return camera;
 const at=camera.point(ball.x,ball.y);
 const lift=Math.max(0,ball.z||0)*camera.scale*heightScale;
 const dx=width/2-at.x,dy=height/2-at.y+lift;
 return {...camera,point:(x,y)=>{const p=camera.point(x,y);return {x:p.x+dx,y:p.y+dy}},world:(x,y)=>camera.world(x-dx,y-dy)};
}

// Ease into ball tracking from the exact pre-snap view without changing scale.
export function snapFollowCamera(camera,ball,width,height,elapsed,heightScale=.65){
 const tracked=ballFollowCamera(camera,ball,width,height,heightScale);
 const t=Math.max(0,Math.min(1,elapsed/.65)),blend=t*t*(3-2*t);
 const a=camera.point(0,0),b=tracked.point(0,0),dx=(b.x-a.x)*blend,dy=(b.y-a.y)*blend;
 return {...camera,point:(x,y)=>{const p=camera.point(x,y);return {x:p.x+dx,y:p.y+dy}},world:(x,y)=>camera.world(x-dx,y-dy)};
}
