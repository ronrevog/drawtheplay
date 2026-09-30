export const DT=.05;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const defaults={QB:[225,74,7.2],RB:[215,71,8.6],WR:[200,73,9],TE:[250,77,7.7],OL:[310,77,5.6],DL:[285,76,6.5],LB:[235,74,7.7],DB:[200,72,9.1]};
/** Explicit game estimates, not measured NFL skill grades. Combine numbers are historical. */
export function footballTraits(p={},position='WR'){
 const [weight,height,speed]=defaults[position]||defaults.WR;const overall=clamp(p.overall??65,35,99),b=p.bio||{},c=p.combine||{};
 const mass=b.weightLbs||weight,reach=(b.heightInches||height)/36;
 const rating=(n)=>clamp(overall+n,30,99);
 // 40 yards, not metres; top speed is above the standing-start average.
 const topSpeed=c.fortySeconds?clamp((40/c.fortySeconds*1.06)*.6+speed*.4,5,10):speed+(overall-75)*.018;
 const agility=rating(c.threeConeSeconds?(7.1-c.threeConeSeconds)*16:c.shuttleSeconds?(4.3-c.shuttleSeconds)*18:0);
 return {mass,reach,topSpeed,acceleration:3.4+agility*.036-(mass-200)*.005,agility,
 strength:rating((mass-weight)*.2+(c.benchReps? (c.benchReps-22)*.45:0)),
 blocking:rating(position==='OL'?4:position==='TE'?-4:-15),rush:rating(position==='DL'?3:0),
 coverage:rating(position==='DB'?3:position==='LB'?-5:-18),catching:rating(position==='WR'?4:position==='DB'?-15:0),
 tackling:rating(position==='DB'?-3:3),vision:rating(Math.min(5,(p.experience||0)*.45)),accuracy:rating(0),
 reaction:clamp(.43-(overall-60)*.005,.19,.55),ballSecurity:rating(3),elusiveness:agility};
}
export function steer(p,target,maxSpeed,dt=DT,arrive=true){
 const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);const stop=Math.sqrt(Math.max(0,2*p.traits.acceleration*d));
 const fatigue=1-Math.max(0,(p.distance||0)-25)*.0018;const speed=Math.min(maxSpeed*clamp(fatigue,.8,1),arrive?stop:Infinity);
 const vx=d>.02?dx/d*speed:0,vy=d>.02?dy/d*speed:0;
 const change=Math.hypot(vx-p.vx,vy-p.vy);const maxChange=p.traits.acceleration*dt;const factor=Math.min(1,maxChange/Math.max(.001,change));
 p.vx+=(vx-p.vx)*factor;p.vy+=(vy-p.vy)*factor;p.x+=p.vx*dt;p.y+=p.vy*dt;p.distance=(p.distance||0)+Math.hypot(p.vx,p.vy)*dt;
}
export function routeLength(path){return path.slice(1).reduce((sum,b,i)=>sum+distance(path[i],b),0)}
export function alongRoute(path,travel){let left=travel;for(let i=1;i<path.length;i++){const len=distance(path[i-1],path[i]);if(left<=len){const f=left/Math.max(.001,len);return {x:path[i-1].x+(path[i].x-path[i-1].x)*f,y:path[i-1].y+(path[i].y-path[i-1].y)*f}}left-=len}return path.at(-1)}
export function followRoute(p,path,speed){
 if(!path?.length){steer(p,p,0);return}
 p.waypoint=p.waypoint||1;
 while(p.waypoint<path.length-1&&distance(p,path[p.waypoint])<.9)p.waypoint++;
 const target=path[Math.min(p.waypoint,path.length-1)];
 let pace=speed;if(p.waypoint<path.length-1){const next=path[p.waypoint+1],d=distance(p,target),v=Math.hypot(p.vx,p.vy);const dot=((target.x-p.x)*(next.x-target.x)+(target.y-p.y)*(next.y-target.y))/Math.max(.01,d*distance(target,next));if(dot<.7&&d<Math.max(1.5,v*.28))pace*=.55+p.traits.agility*.003;}
 steer(p,target,pace);
}
export function separateBodies(people,engaged){
 for(let pass=0;pass<2;pass++)for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++){
 const a=people[i],b=people[j];if(engaged.has(`${a.slot}/${b.slot}`)||engaged.has(`${b.slot}/${a.slot}`))continue;
 const min=.94,d=distance(a,b);if(d>=min)continue;const dx=d>.001?(b.x-a.x)/d:1,dy=d>.001?(b.y-a.y)/d:0;
 const overlap=min-d;const weight=a.traits.mass/(a.traits.mass+b.traits.mass);
 a.x-=dx*overlap*(1-weight);a.y-=dy*overlap*(1-weight);b.x+=dx*overlap*weight;b.y+=dy*overlap*weight;
 // Contact sheds forward momentum rather than allowing bodies to tunnel through.
 const closing=(a.vx-b.vx)*dx+(a.vy-b.vy)*dy;if(closing>0){a.vx-=dx*closing*(1-weight);a.vy-=dy*closing*(1-weight);b.vx+=dx*closing*weight;b.vy+=dy*closing*weight;}
 }
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const f=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(.001,dx*dx+dy*dy),0,1);return {distance:Math.hypot(p.x-a.x-f*dx,p.y-a.y-f*dy),fraction:f}}
