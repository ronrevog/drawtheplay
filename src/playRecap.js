export function recapCommentary(event){
 const sim=event.simulation||{},events=sim.events||[];
 const name=(slot,side,fallback)=>sim.people?.find(p=>p.slot===slot&&p.side===side)?.name||fallback;
 const find=type=>events.find(e=>e.type===type);
 const qb=name('QB','offense','The quarterback');
 const receiver=name(sim.targetSlot||find('Throw')?.to,'offense','the intended receiver');
 const runner=name(event.play?.runner||'RB','offense','The runner');
 const carrier=event.play?.type==='run'?runner:receiver;
 const stop=find('Tackle')||find('Sack')||find('Interception');
 const defender=stop?name(stop.by,sim.special?'offense':'defense','The defense'):'The defense';
 const finish=find('Tackle')?` ${defender} makes the stop.`:'';
 if(sim.special){
  const kick=events.find(e=>['Kickoff','Placekick','Punt'].includes(e.type));
  const kicker=name(kick?.by|| (sim.special==='punt'?'P':'K'),'offense','The kicker');
  const returner=name(find('Return')?.by||find('Catch')?.by||'KR','defense','The returner');
  if(find('Kick blocked'))return `${name(find('Kick blocked').by,'defense','The defense')} blocks the kick from ${kicker}!`;
  if(['fg','pat'].includes(sim.special))return sim.good?`${kicker} sends it through the uprights!`:`No good. ${kicker} cannot convert this one.`;
  if(event.text?.includes('TOUCHDOWN')||sim.outcome==='Touchdown')return `${returner} takes ${kicker}'s kick all the way! Put six on the board.`;
  if(sim.outcome==='Touchback')return `${kicker}'s kick results in a touchback. The offense takes over.`;
  if(sim.outcome==='Fair catch')return `${returner} calls for a fair catch on ${kicker}'s punt.`;
  if(find('Return'))return `${returner} brings back ${kicker}'s kick${Number.isFinite(sim.returnYards)?` for ${sim.returnYards} yards`:''}.${finish}`;
  return `${kicker} sends it away and sets up the next possession.`;
 }
 if(event.text?.includes('TOUCHDOWN'))return event.play?.type==='run'?`${runner} takes it to the house! Put six on the board.`:`${qb} finds ${receiver} for the touchdown! Put six on the board.`;
 if(event.text?.includes('SAFETY'))return `${defender} stops ${event.kind==='sack'?qb:carrier} in the end zone — two points for the defense!`;
 if(event.kind==='interception')return `${defender} picks off ${qb}${sim.targetSlot?` on the throw intended for ${receiver}`:''}! Possession changes hands.`;
 if(event.kind==='fumble')return `${name(find('Fumble')?.by,'offense',carrier)} loses the ball, and the defense takes over. A costly finish!`;
 if(event.kind==='sack')return `${defender} gets home! ${qb} goes down behind the line.`;
 if(event.kind==='incomplete')return `${qb}'s pass${sim.targetSlot?` intended for ${receiver}`:''} falls incomplete. The defense wins this down.`;
 const gain=Number.isFinite(event.yards)?` for ${event.yards} yards`:'';
 let call=event.kind==='pass'?`${qb} connects with ${receiver}${gain}.`:`${runner} carries${gain}.`;
 if(find('Broken tackle'))call+=` ${carrier} shakes off ${name(find('Broken tackle').against,'defense','a defender')}!`;
 else if(find('Catch')?.contested)call+=` ${receiver} hangs on through tight coverage!`;
 else if(event.yards>=20)call+=' A big pickup!';
 call+=finish;
 if(event.text?.includes('turnover on downs'))call+=' Short of the sticks — the defense takes over.';
 else if(event.text?.includes('first down'))call+=' Move the chains!';
 else if(event.yards<=0)call+=' The defense holds its ground.';
 return call;
}

// Use recorded participants and events, never infer a tackler from proximity.
export function recapPlayers(event,game){
 const sim=event?.simulation;if(!sim)return [];
 const result=[],people=sim.people||[],events=sim.events||[];
 
 function add(slot,side,role){const person=people.find(p=>p.slot===slot&&(!side||p.side===side));if(!person)return;const existing=result.find(p=>p.id===person.id&&p.side===person.side);if(existing){if(!existing.roles.includes(role))existing.roles.push(role);return}result.push({...person,...(game[(person.side==='offense')===(event.side==='home')?'home':'away']||[]).find(p=>p.id===person.id),side:person.side,slot:person.slot,roles:[role]})}
 if(sim.special){for(const e of events){if(['Kickoff','Placekick','Punt'].includes(e.type))add(e.by,'offense',e.type==='Punt'?'Punter':'Kicker');if(e.type==='Return'||e.type==='Catch')add(e.by,'defense','Returner');if(e.type==='Tackle')add(e.by,'offense','Tackler');if(e.type==='Kick blocked')add(e.by,'defense','Blocked kick')}}
 else {
  add('QB','offense','Quarterback');
  if(event.play?.type==='run')add(event.play.runner||'RB','offense','Ball carrier');
  if(sim.targetSlot)add(sim.targetSlot,'offense',events.some(e=>e.type==='Catch')?'Receiver':'Intended receiver');
  for(const e of events){if(e.type==='Tackle')add(e.by,'defense','Tackler');if(e.type==='Sack')add(e.by,'defense','Sack');if(e.type==='Interception')add(e.by,'defense','Interception');if(e.type==='Fumble')add(e.by,'offense','Fumble');}
 }
 return result;
}
