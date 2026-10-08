// Straight overhead field: parallel sidelines and perpendicular yard lines.
export function projectYards(x,y){return {x,y:-y}}
export function all22Camera(frames,width,height,{zoom=1,pan={x:0,y:0},spot=25}={}){
 const points=frames.flatMap(f=>[...(f.players||[]),...(f.ball?[f.ball]:[])]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 const low=zoom===0?-spot-10:Math.min(-8,...points.map(p=>p.y))-5,high=zoom===0?110-spot:Math.max(18,...points.map(p=>p.y))+7;
 const corners=[projectYards(-3,low),projectYards(56.3,low),projectYards(-3,high),projectYards(56.3,high)];
 const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x)),minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
 const scale=Math.max(.1,Math.min((width-48)/(maxX-minX),(height-96)/(maxY-minY)))*([1,1,1.5,2.1][zoom]||1);
 const cx=(minX+maxX)/2+(zoom===0?0:pan.x||0),cy=(minY+maxY)/2+(zoom===0?0:pan.y||0);
 return {scale,low,high,point:(x,y)=>{const p=projectYards(x,y);return {x:width/2+(p.x-cx)*scale,y:height/2+20+(p.y-cy)*scale}},world:(x,y)=>({x:(x-width/2)/scale+cx,y:-((y-height/2-20)/scale+cy)})};
}
export function playerAnimation(p,carrier){
 const s=p.status||'',moving=Math.hypot(p.vx||0,p.vy||0)>.6;
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
 const heading=p.animationHeading??(Math.hypot(vx,vy)>.3?Math.atan2(vx,vy):p.side==='defense'?Math.PI:0);
 return (Math.round(heading/(Math.PI*2)*count)+count)%count;
}
