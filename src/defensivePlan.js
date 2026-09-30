export const DEFENSIVE_SLOTS=['DE1','DT1','DT2','DE2','LB1','LB2','LB3','CB1','CB2','S1','S2'];
const bound=(n,a,b)=>Math.max(a,Math.min(b,n));
export function defensivePoint(point,spot=25,blitz=false){
 return {x:bound(Number.isFinite(point?.x)?point.x:26.65,.7,52.6),y:bound(Number.isFinite(point?.y)?point.y:1,blitz?-spot-9.3:.8,109.3-spot)};
}
export function normalizeDefense(plan={},spot=25){
 return Object.fromEntries(DEFENSIVE_SLOTS.filter(slot=>plan?.[slot]).map(slot=>{
  const entry=plan[slot],out={};
  if(entry.start)out.start=defensivePoint(entry.start,spot);
  if(['man','zone','blitz'].includes(entry.type))out.type=entry.type;
  if(out.type==='man'&&['QB','RB','WR1','WR2','WR3','TE','LT','LG','C','RG','RT'].includes(entry.target))out.target=entry.target;
  if(out.type==='zone'||out.type==='blitz')out.path=(Array.isArray(entry.path)?entry.path:[]).slice(0,300).map(p=>defensivePoint(p,spot,out.type==='blitz'));
  return [slot,out];
 }));
}
