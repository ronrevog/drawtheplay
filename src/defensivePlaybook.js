import {DEFENSIVE_SLOTS} from './defensivePlan.js';
// Original game implementations of standard football fronts and responsibilities.
export const DEFENSIVE_FORMATIONS={
 '4–3':[4,3,4],'3–4':[3,4,4],'4–4':[4,4,3],'5–2':[5,2,4],
 'Nickel 4–2–5':[4,2,5],'Nickel 3–3–5':[3,3,5],'Dime 4–1–6':[4,1,6],'Goal line 6–2':[6,2,3]
};
const calls=[
 ['4–3','Cover 1','Man',1],['4–3','Cover 2','Zone',2],['4–3','Sam Fire','Blitz',3],
 ['3–4','Cover 1','Man',1],['3–4','Cover 3','Zone',3],['3–4','Double Inside','Blitz',0],
 ['4–4','Cover 1','Man',1],['4–4','Cover 3','Zone',3],['4–4','Strong Storm','Blitz',0],
 ['5–2','Cover 1','Man',1],['5–2','Cover 2','Zone',2],['5–2','Mike Fire','Blitz',3],
 ['Nickel 4–2–5','Two Man','Man',2],['Nickel 4–2–5','Cover 3','Zone',3],['Nickel 4–2–5','Slot Fire','Blitz',3],
 ['Nickel 3–3–5','Cover 1','Man',1],['Nickel 3–3–5','Cover 3','Zone',3],['Nickel 3–3–5','Stack Pressure','Blitz',0],
 ['Dime 4–1–6','Two Man','Man',2],['Dime 4–1–6','Quarters','Zone',4],['Dime 4–1–6','Corner Fire','Blitz',3],
 ['Goal line 6–2','Cover 0','Man',0],['Goal line 6–2','Goal Zone','Zone',2],['Goal line 6–2','All Gaps','Blitz',0],
 ['Dime 4–1–6','Prevent','Zone',4]
];
export const DEFENSIVE_PLAYS=calls.map(([formation,concept,type,shell],i)=>({id:`def-${i+1}`,name:`${formation} ${concept}`,formation,concept,type,shell,description:type==='Blitz'?`${concept}: extra pressure with ${shell?`${shell}-deep zone support`:'man coverage behind the rush'}.`:type==='Man'?`Match eligible receivers${shell?` with ${shell} deep help defender${shell>1?'s':''}`:' without deep help'}.`:`Protect ${shell} deep zones with underneath defenders reading receivers.`}));
export const findDefensivePlay=value=>DEFENSIVE_PLAYS.find(p=>p.name===value||p.id===value);
export function defensivePackage(value){
 const call=findDefensivePlay(value);if(!call)return null;
 const [dl,lb,db]=DEFENSIVE_FORMATIONS[call.formation];
 const roles=[...Array(dl).fill('DL'),...Array(lb).fill('LB'),...Array(db).fill('DB')];
 const positions=roles.map((role,i)=>{
  const index=i-(role==='DL'?0:role==='LB'?dl:dl+lb),count=role==='DL'?dl:role==='LB'?lb:db;
  const x=role==='DL'?26.65+(index-(count-1)/2)*3.5:role==='LB'?26.65+(index-(count-1)/2)*8:5+index*43.3/(count-1);
  return {slot:DEFENSIVE_SLOTS[i],role,x,y:role==='DL'?1.2:role==='LB'?5:call.type==='Man'?7.5:9};
 });
 const rush=new Set(positions.slice(0,dl).map(p=>p.slot));
 if(call.type==='Blitz'){
  // Fire zones retain three deep + three underneath; other pressures add two.
  const count=call.shell?Math.max(0,5-dl):Math.min(2,11-dl);
  const extra=call.concept.includes('Slot')||call.concept.includes('Corner')?positions.slice(dl+lb):positions.slice(dl);
  extra.slice(0,Math.max(0,count)).forEach(p=>rush.add(p.slot));
 }
 const cover=positions.filter(p=>!rush.has(p.slot)),deep=cover.slice(-Math.min(call.shell,cover.length));
 const under=cover.filter(p=>!deep.includes(p));
 const plan={};
 for(const p of positions){
  let entry={start:{x:p.x,y:p.y}};
  if(rush.has(p.slot))entry={...entry,type:'blitz',path:[entry.start,{x:p.x,y:-2}]};
  else if(deep.includes(p)){const i=deep.indexOf(p);entry={...entry,type:'zone',path:[entry.start,{x:53.3*(i+.5)/deep.length,y:call.concept==='Prevent'?30:call.formation.startsWith('Goal')?8:20}]};}
  else if(call.type==='Man'||!call.shell)entry={...entry,type:'man',target:['WR1','WR2','WR3','TE','RB'][under.indexOf(p)%5]};
  else entry={...entry,type:'zone',path:[entry.start,{x:53.3*(under.indexOf(p)+.5)/under.length,y:call.formation.startsWith('Goal')?3:7}]};
  plan[p.slot]=entry;
 }
 return {call,positions,plan,rushers:[...rush]};
}
export function defensivePersonnel(value,roster,starters){
 const pack=defensivePackage(value);if(!pack)return starters;
 const used=new Set(),result={};
 for(const p of pack.positions){const preferred=starters[p.slot];const player=preferred?.position===p.role&&!used.has(preferred.id)?preferred:roster.find(r=>r.position===p.role&&!used.has(r.id))||roster.find(r=>['DL','LB','DB'].includes(r.position)&&!used.has(r.id));if(player){used.add(player.id);result[p.slot]=player}}
 return result;
}
