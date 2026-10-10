const row=(slot,label,group,details,unit,field=slot)=>({slot,label,group,details:details.split(','),unit,field});
export const DEPTH_ROWS=[
 row('QB','Quarterback','QB','QB','Offense'),row('RB','Running back','RB','RB,HB','Offense'),
 row('WR1','Wide receiver · left','WR','WR','Offense'),row('WR2','Wide receiver · right','WR','WR','Offense'),row('WR3','Slot receiver','WR','WR','Offense'),row('TE','Tight end','TE','TE','Offense'),
 row('LT','Left tackle','OL','LT,T','Offense'),row('LG','Left guard','OL','LG,G','Offense'),row('C','Center','OL','C','Offense'),row('RG','Right guard','OL','RG,G','Offense'),row('RT','Right tackle','OL','RT,T','Offense'),
 row('LDE','Left defensive end','DL','DE','Defense','DE1'),row('LDT','Left defensive tackle','DL','DT,NT','Defense','DT1'),row('RDT','Right defensive tackle','DL','DT,NT','Defense','DT2'),row('RDE','Right defensive end','DL','DE','Defense','DE2'),
 row('WLB','Weakside linebacker','LB','OLB,LB','Defense','LB1'),row('MLB','Middle linebacker','LB','MLB,ILB,LB','Defense','LB2'),row('SLB','Strongside linebacker','LB','OLB,LB','Defense','LB3'),
 row('LCB','Left cornerback','DB','CB,DB','Defense','CB1'),row('RCB','Right cornerback','DB','CB,DB','Defense','CB2'),row('FS','Free safety','DB','FS,S','Defense','S1'),row('SS','Strong safety','DB','SS,S','Defense','S2'),
 row('K','Kicker','K','K','Special teams'),row('P','Punter','P','P','Special teams'),row('LS','Long snapper','LS','LS','Special teams'),row('H','Holder','P,QB','P,QB','Special teams'),row('KR','Kick returner','WR,RB,DB','WR,RB,CB','Special teams'),row('PR','Punt returner','WR,RB,DB','WR,RB,CB','Special teams')
];
export function depthCandidates(roster,depth,row){return roster.filter(p=>row.group.split(',').includes(p.position)).sort((a,b)=>{
 const ids=depth[row.slot]||depth[row.group]||[];const rank=p=>{const i=ids.indexOf(p.id);return i<0?999:i};
 return rank(a)-rank(b)||Number(row.details.includes(b.detailPosition))-Number(row.details.includes(a.detailPosition))||b.overall-a.overall||a.name.localeCompare(b.name);
})}
export function depthStarters(roster,depth={},unit='Offense'){
 const rows=DEPTH_ROWS.filter(r=>r.unit===unit),result={},used=new Set();
 // Reserve explicit starters first so automatic choices cannot take their places.
 for(const r of rows){const p=depthCandidates(roster,depth,r).find(p=>p.id===depth[r.slot]?.[0]);if(p&&(!used.has(p.id)||unit==='Special teams')){result[r.field]=p;used.add(p.id)}}
 for(const r of rows)if(!result[r.field]){const p=depthCandidates(roster,depth,r).find(p=>unit==='Special teams'||!used.has(p.id));if(p){result[r.field]=p;used.add(p.id)}}
 return result;
}
export function depthOrder(roster,depth,row){const starters=depthStarters(roster,depth,row.unit),first=starters[row.field];return [first,...depthCandidates(roster,depth,row).filter(p=>p.id!==first?.id&&(!Object.values(starters).some(s=>s.id===p.id)||row.unit==='Special teams'))].filter(Boolean)}
export function setDepthPlayer(roster,depth,slot,rank,id){const row=DEPTH_ROWS.find(r=>r.slot===slot);if(!row||!depthCandidates(roster,depth,row).some(p=>p.id===id))return depth;
 const next={...depth};for(const r of DEPTH_ROWS.filter(r=>r.unit===row.unit))next[r.slot]=depthOrder(roster,depth,r).map(p=>p.id);
 const order=next[slot].filter(x=>x!==id);order.splice(rank,0,id);next[slot]=order;
 if(rank===0&&row.unit!=='Special teams')for(const r of DEPTH_ROWS.filter(r=>r.unit===row.unit&&r.slot!==slot))next[r.slot]=next[r.slot].filter(x=>x!==id);
 return next;
}
