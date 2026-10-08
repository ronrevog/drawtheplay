// Presentation-only finish: the whistle, game clock, spot and outcome stay unchanged.
export function withTackleFinish(simulation){
 if(!simulation?.frames?.length)return simulation;
 const end=simulation.events?.at(-1);
 if(!['Tackle','Sack','Fumble'].includes(end?.type))return simulation;
 const last=simulation.frames.at(-1),contact=end.type==='Fumble'?simulation.events.findLast(e=>e.type==='Contact'):end;
 const carrier=last.players.find(p=>p.slot===last.carrier),tackler=last.players.find(p=>p.slot===contact?.by&&p!==carrier);
 if(!carrier||!tackler)return simulation;
 const start=last.t,heading=Math.atan2(carrier.x-tackler.x,carrier.y-tackler.y);
 const finish={...last,phase:end.type==='Sack'?'Sack':'Tackle',blocks:[],ball:{...last.ball,z:0},players:last.players.map(p=>({...p,vx:0,vy:0,...(p===carrier?{status:'Tackled',animationStart:start,animationHeading:heading}:p===tackler?{status:'Tackling',animationStart:start,animationHeading:heading}:{})}))};
 const frames=[...simulation.frames.slice(0,-1),finish];
 for(let step=1;step<=24;step++)frames.push({...finish,t:+(start+step*.05).toFixed(2)});
 return {...simulation,frames,duration:frames.at(-1).t};
}
export function spriteFrame(player,elapsed,count){
 if(player.animationStart!==undefined)return Math.min(count-1,Math.max(0,Math.floor((elapsed-player.animationStart)*10)));
 return Math.floor(elapsed*8)%count;
}
