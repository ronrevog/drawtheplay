// Presentation only: dead-ball bounces never change the spot, clock or result.
export function withIncompleteBounce(simulation){
 if(!simulation?.frames?.length||simulation.kind!=='incomplete')return simulation;
 const last=simulation.frames.at(-1);
 if(last.phase==='Ball bounce')return simulation;
 const previous=simulation.frames.slice(0,-1).findLast(f=>Math.hypot(f.ball.x-last.ball.x,f.ball.y-last.ball.y)>.01);
 const dx=last.ball.x-(previous?.ball.x??last.ball.x),dy=last.ball.y-(previous?.ball.y??last.ball.y),length=Math.hypot(dx,dy);
 const ux=length?dx/length:0,uy=length?dy/length:1,heading=Math.atan2(-uy,ux);
 const start=last.t,frames=[...simulation.frames];
 let x=last.ball.x,y=last.ball.y,z=Math.max(0,last.ball.z||0),vx=ux*3.8,vy=uy*3.8,vz=-2.5,angle=heading,spin=10,bounces=0;
 for(let i=1;i<=40;i++){
  const dt=.05;vz-=18*dt;z+=vz*dt;
  if(z<0){z=0;if(bounces<3&&Math.abs(vz)>.8){vz=-vz*.5;bounces++;vx*=.68;vy*=.68;const sideways=bounces%2?.4:-.25;vx+=-uy*sideways;vy+=ux*sideways;}else vz=0;spin*=.58;}
  x+=vx*dt;y+=vy*dt;angle+=spin*dt;
  vx*=z===0?.75:.98;vy*=z===0?.75:.98;
  frames.push({...last,t:+(start+i*dt).toFixed(3),phase:'Ball bounce',carrier:null,blocks:[],ballAngle:angle,ball:{x,y,z},players:last.players.map(p=>({...p,vx:0,vy:0,status:'Watch'}))});
 }
 const final=frames.at(-1);final.ball={...final.ball,z:0};
 return {...simulation,frames,duration:final.t};
}
