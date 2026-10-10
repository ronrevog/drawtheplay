export function withTouchdownCelebration(simulation){
 if(!simulation?.frames?.length||!simulation.events?.some(e=>e.type==='Touchdown'))return simulation;
 const last=simulation.frames.at(-1),scorer=last.carrier||simulation.events.findLast(e=>e.type==='Touchdown')?.by;
 const frames=[...simulation.frames];
 for(let i=1;i<=60;i++){const time=i*.05;frames.push({...last,t:last.t+time,phase:'Celebration',blocks:[],players:last.players.map(p=>({...p,vx:0,vy:0,status:p.slot===scorer?'Celebrate':'Watch',celebrationLift:p.slot===scorer?Math.max(0,Math.sin(time*Math.PI*2))*.65:0}))})}
 return {...simulation,frames,duration:frames.at(-1).t};
}
export function isTouchdown(event){return event?.simulation?.events?.some(e=>e.type==='Touchdown')||/TOUCHDOWN/i.test(event?.text||'')}
