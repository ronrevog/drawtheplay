// Presentation-only finish: the whistle, game clock, spot and outcome stay unchanged.
export function withTackleFinish(simulation){
 if(!simulation?.frames?.length)return simulation;
 const end=simulation.events?.findLast(e=>['Tackle','Sack','Fumble','Out of bounds','Touchdown','Incomplete','Throwaway','Whistle','Interception'].includes(e.type));
 if(!['Tackle','Sack','Fumble'].includes(end?.type))return simulation;
 const last=simulation.frames.at(-1),contact=end.type==='Fumble'?simulation.events.findLast(e=>e.type==='Contact'):end;
 const sack=end.type==='Sack';
 const carrier=last.players.find(p=>sack?p.slot==='QB'&&p.side==='offense':p.slot===last.carrier),tackler=last.players.find(p=>p.slot===contact?.by&&p!==carrier);
 if(!carrier||!tackler)return simulation;
 const start=last.t,heading=Math.atan2(carrier.x-tackler.x,carrier.y-tackler.y);
 const finish={...last,carrier:carrier.slot,phase:sack?'Sack':'Tackle',blocks:[],ball:{...last.ball,x:carrier.x,y:carrier.y,z:0},players:last.players.map(p=>({...p,vx:0,vy:0,...(p===carrier?{status:'Tackled',animationStart:start,animationHeading:heading}:p===tackler?{status:'Tackling',animationStart:start,animationHeading:heading}:{})}))};
 // L2BSIDL is a paired animation: the carrier sprite includes this tackler.
 finish.players.find(p=>p.slot===carrier.slot&&p.side===carrier.side).animationPartner={slot:tackler.slot,side:tackler.side};
 const frames=[...simulation.frames.slice(0,-1),finish];
 for(let step=1;step<=24;step++)frames.push({...finish,t:+(start+step*.05).toFixed(2)});
 return {...simulation,frames,duration:frames.at(-1).t};
}
export function spriteFrame(player,elapsed,count){
 if(player.animationStart!==undefined)return Math.min(count-1,Math.max(0,Math.floor((elapsed-player.animationStart)*10)));
 return Math.floor(elapsed*8)%count;
}
