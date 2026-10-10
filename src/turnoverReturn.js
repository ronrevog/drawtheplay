import {steer,distance,DT} from './footballPhysics.js';
export function finishTurnover(sim,rng){
 if(!['interception','fumble'].includes(sim.kind))return sim;
 const last=sim.frames.at(-1),players=last.players.map(p=>({...p,traits:sim.people.find(m=>m.slot===p.slot&&m.side===p.side).traits}));
 const frames=[...sim.frames],events=[...sim.events];let t=last.t,ball={...last.ball},carrier=sim.kind==='interception'?players.find(p=>p.slot===last.carrier):null;
 const push=phase=>frames.push({t:+t.toFixed(3),phase,ball:{...ball},carrier:carrier?.slot||null,blocks:[],players:players.map(p=>({...p}))});
 const event=(type,by)=>events.push({t:+t.toFixed(3),type,by:by?.slot,side:by?.side});
 if(!carrier){
  const start=t,origin={...ball},dx=rng.int(-10,10)/10,dy=rng.int(-10,10)/10;
  for(let i=0;i<40&&!carrier;i++){t+=DT;const elapsed=t-start;ball={x:Math.max(.3,Math.min(53,origin.x+dx*Math.min(elapsed,1))),y:origin.y+dy*Math.min(elapsed,1),z:Math.abs(Math.sin(elapsed*10))*.6*Math.exp(-elapsed*2)};
   for(const p of players){p.status='Loose ball';steer(p,ball,p.traits.topSpeed*.85)}
   if(elapsed>.35){carrier=players.filter(p=>distance(p,ball)<.85).sort((a,b)=>distance(a,ball)-distance(b,ball))[0]||null}
   if(carrier)ball={x:carrier.x,y:carrier.y,z:.3};
   push('Loose ball');
  }
  carrier??=[...players].sort((a,b)=>distance(a,ball)-distance(b,ball))[0];event('Recovery',carrier);
 }
 const recoveryY=carrier.y,recoverySide=carrier.side;
 carrier.animationStart=t;carrier.status=sim.kind==='interception'?'Interception catch':'Recovery';carrier.vx=0;carrier.vy=0;
 for(let i=0;i<7;i++){t+=DT;ball={x:carrier.x,y:carrier.y,z:.5};push('Possession secured')}
 delete carrier.animationStart;
 const direction=recoverySide==='defense'?-1:1,pursuers=players.filter(p=>p.side!==recoverySide);let stopped=false;
 if(recoverySide==='defense'&&sim.spot+recoveryY>=100){event('Touchback',carrier);stopped=true}
 for(let i=0;i<240&&!stopped;i++){
  t+=DT;carrier.status='Carry';steer(carrier,{x:Math.max(1,Math.min(52,carrier.x)),y:carrier.y+direction*8},carrier.traits.topSpeed*.94,DT,false);
  for(const p of players){if(p===carrier)continue;p.status=p.side===recoverySide?'Escort':'Pursuit';const goal=p.side===recoverySide?{x:carrier.x+(p.x<carrier.x?-2:2),y:carrier.y+direction*3}:{x:carrier.x+carrier.vx*.2,y:carrier.y+carrier.vy*.2};steer(p,goal,p.traits.topSpeed*.96)}
  ball={x:carrier.x,y:carrier.y,z:.4};
  if((direction<0&&sim.spot+carrier.y<=0)||(direction>0&&sim.spot+carrier.y>=100)){carrier.y=direction<0?-sim.spot:100-sim.spot;ball.y=carrier.y;event('Touchdown',carrier);stopped=true}
  else if(carrier.x<=.3||carrier.x>=53){event('Out of bounds',carrier);stopped=true}
  else{const tackler=pursuers.find(p=>distance(p,carrier)<1.15);if(tackler){event('Tackle',tackler);stopped=true}}
  push(stopped?'Dead ball':'Turnover return');
 }
 if(!stopped)event('Whistle',carrier);
 return {...sim,offensiveYards:sim.yards,frames,events,duration:t,recoveryY,recoverySide,returnYards:direction*(carrier.y-recoveryY),yards:Math.round(carrier.y),playerId:carrier.id||sim.people.find(p=>p.slot===carrier.slot&&p.side===carrier.side)?.id,playerName:sim.people.find(p=>p.slot===carrier.slot&&p.side===carrier.side)?.name,fumblerName:sim.kind==='fumble'?sim.playerName:undefined};
}
