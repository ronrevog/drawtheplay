import {offensiveAlignment,fieldPlayers} from './playbook.js';
const lineSlots=['LT','LG','C','RG','RT'];
// Sprite feet sit 0.75 yards behind the ball when their body is on the line.
export function formationRules(play,roster=[],depth={}){
 const players=fieldPlayers(roster,depth),alignment=offensiveAlignment(play);
 const onLine=alignment.filter(([,x,y])=>y>=60.5&&y<=61.5).sort((a,b)=>a[1]-b[1]);
 const ends=[onLine[0]?.[0],onLine.at(-1)?.[0]],errors=[],eligible=[],covered=[];
 if(onLine.length<7)errors.push(`Need at least 7 on the line (${onLine.length} now; ${11-onLine.length} in the backfield).`);
 const center=alignment.find(p=>p[0]==='C');
 if(Math.abs(center[2]-61)>.1)errors.push('The center must stay on the line.');
 for(const [slot,x,y] of alignment){
  const isLine=onLine.some(p=>p[0]===slot),interior=isLine&&!ends.includes(slot);
  const number=players[slot]?.number,hasNumber=number!==undefined&&number!==null&&number!==''&&Number.isFinite(Number(number));
  const numberedEligible=hasNumber?(Number(number)>=0&&Number(number)<=49||Number(number)>=80&&Number(number)<=89):!lineSlots.includes(slot);
  const report=play.reports?.[slot],canReceive=report?report==='eligible':numberedEligible;
  if(report==='ineligible'&&numberedEligible&&(!interior||Math.abs(onLine.findIndex(p=>p[0]===slot)-onLine.findIndex(p=>p[0]==='C'))>2))errors.push(`${slot}: reporting ineligible requires a position in the five-player core around the center.`);
  if(y<60.5||y>61.5&&y<63)errors.push(`${slot}: line up clearly on or behind the line.`);
  if(interior&&canReceive){covered.push(slot);errors.push(`${slot} is covered up. Move behind the line or report ineligible.`);}
  if(isLine&&ends.includes(slot)&&!canReceive)errors.push(`${slot} is on an end and must report eligible or move inside.`);
  if(!isLine&&!canReceive)errors.push(`${slot} must report eligible to line up in the backfield.`);
  if(slot==='QB'&&isLine)errors.push('Keep the quarterback behind the center for the snap.');
  if(canReceive&&!interior&&slot!=='QB')eligible.push(slot);
 }
 for(let i=0;i<alignment.length;i++)for(let j=i+1;j<alignment.length;j++){
  const a=alignment[i],b=alignment[j];if(Math.hypot((a[1]-b[1])*.533,(a[2]-b[2])*.75)<.95)errors.push(`${a[0]} and ${b[0]} need more space.`);
 }
 return {legal:!errors.length,errors,onLine:onLine.map(p=>p[0]),backfield:11-onLine.length,ends,eligible,covered};
}
