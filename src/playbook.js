import {DEFENSIVE_PLAYS} from './defensivePlaybook.js';
import {depthStarters} from './depthChart.js';
export const FORMATIONS={
 Shotgun:[['QB',50,68],['RB',62,69],['WR1',12,61],['WR2',88,61],['TE',72,63],['WR3',25,65],['LT',43,61],['LG',46.5,61],['C',50,61],['RG',53.5,61],['RT',57,61]],
 Singleback:[['QB',50,63.3],['RB',50,70],['WR1',12,61],['WR2',88,61],['TE',72,63],['WR3',25,65],['LT',43,61],['LG',46.5,61],['C',50,61],['RG',53.5,61],['RT',57,61]],
 Trips:[['QB',50,68],['RB',38,69],['WR1',12,61],['WR2',88,61],['TE',76,67],['WR3',88,73],['LT',43,61],['LG',46.5,61],['C',50,61],['RG',53.5,61],['RT',57,61]],
};
export function offensiveAlignment(play){return FORMATIONS[play.formation].map(([slot,x,y])=>[slot,...(play.positions?.[slot]||[x,y])]);}
export function positionPlayer(play,slot,point){const old=offensiveAlignment(play).find(p=>p[0]===slot);const x=Math.max(2,Math.min(98,point[0])),y=slot==='C'||point[1]<62?61:Math.max(63,Math.min(90,point[1]));const dx=x-old[1],dy=y-old[2];const routes={...play.routes};if(routes[slot])routes[slot]=routes[slot].map(([px,py])=>[Math.max(0,Math.min(100,px+dx)),Math.max(0,Math.min(100,py+dy))]);return {...play,positions:{...play.positions,[slot]:[x,y]},routes};}
export const DEFENSES=['Cover 2','Cover 3','Man','Blitz',...DEFENSIVE_PLAYS.map(p=>p.name)];
export const PRESETS={Go:[[0,-10],[0,-32]],Slant:[[0,-5],[17,-13]],Out:[[0,-15],[18,-15]],Curl:[[0,-20],[-3,-16]],Post:[[0,-17],[-16,-31]],Corner:[[0,-17],[16,-31]],Flat:[[10,-4],[20,-6]],Block:[[0,-7]]};
export const ELIGIBLE=['WR1','WR2','WR3','TE','RB'];
export function presetRoute(formation,slot,type,positions){const token=offensiveAlignment({formation,positions}).find(t=>t[0]===slot);if(!token)return [];const [,x,y]=token;return [[x,y],...PRESETS[type].map(([dx,dy])=>[Math.max(4,Math.min(96,x+(x>50?-dx:dx))),Math.max(8,y+dy)])];}
export function makePlay(id,name,formation,type,routes){return {id,name,formation,type,routes,reads:['WR1','WR2','WR3','TE','RB'],runner:'RB',target:type==='run'?'RB':'WR1'};}
export const DEFAULT_PLAYS=[
 makePlay('slants','Quick slants','Shotgun','pass',{WR1:presetRoute('Shotgun','WR1','Slant'),WR2:presetRoute('Shotgun','WR2','Slant'),WR3:presetRoute('Shotgun','WR3','Flat'),TE:presetRoute('Shotgun','TE','Curl')}),
 makePlay('verticals','Four verticals','Trips','pass',Object.fromEntries(['WR1','WR2','WR3','TE'].map(s=>[s,presetRoute('Trips',s,'Go')]))),
 makePlay('zone','Inside zone','Singleback','run',{RB:[[50,70],[50,65],[54,54],[55,42]],LT:presetRoute('Singleback','LT','Block'),LG:presetRoute('Singleback','LG','Block'),C:presetRoute('Singleback','C','Block'),RG:presetRoute('Singleback','RG','Block'),RT:presetRoute('Singleback','RT','Block')}),
 makePlay('flood','Trips flood','Trips','pass',{WR1:presetRoute('Trips','WR1','Go'),WR2:presetRoute('Trips','WR2','Corner'),WR3:presetRoute('Trips','WR3','Out'),TE:presetRoute('Trips','TE','Flat')}),
];
export function validPlay(p){return Boolean(p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()&&FORMATIONS[p.formation]&&['pass','run'].includes(p.type)&&ELIGIBLE.includes(p.target)&&(!p.reads||(Array.isArray(p.reads)&&p.reads.length===5&&new Set(p.reads).size===5&&p.reads.every(r=>ELIGIBLE.includes(r))))&&(!p.positions||Object.entries(p.positions).every(([slot,pt])=>FORMATIONS[p.formation].some(t=>t[0]===slot)&&Array.isArray(pt)&&pt.length===2&&pt.every(Number.isFinite)&&pt[0]>=2&&pt[0]<=98&&pt[1]>=60.5&&pt[1]<=90))&&(!p.reports||Object.entries(p.reports).every(([slot,value])=>FORMATIONS[p.formation].some(t=>t[0]===slot)&&['eligible','ineligible'].includes(value)))&&p.routes&&typeof p.routes==='object'&&Object.entries(p.routes).every(([slot,path])=>FORMATIONS[p.formation].some(t=>t[0]===slot)&&Array.isArray(path)&&path.length>=2&&path.length<=300&&path.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(Number.isFinite)&&pt.every(n=>n>=0&&n<=100))))}
export function routeRead(play,coverage){const path=play.routes[play.type==='run'?'RB':play.target]||[];if(path.length<2)return {depth:0,bonus:-12,width:0};const start=path[0],end=path.at(-1),depth=Math.max(0,(start[1]-end[1])*.75),width=Math.abs(start[0]-end[0]);let bonus=depth>0?0:-12;if(coverage==='Blitz')bonus+=depth<=12?7:-7;if(coverage==='Cover 2')bonus+=width>12&&depth>12?6:depth<8?2:-2;if(coverage==='Cover 3')bonus+=depth<12?5:-4;if(coverage==='Man')bonus+=width>10?5:-1;return {depth:Math.min(35,depth),width,bonus};}
export function missingPositions(roster){const required={QB:1,RB:1,WR:3,TE:1,OL:5,DL:4,LB:3,DB:4,K:1,P:1,LS:1};return Object.entries(required).filter(([pos,n])=>roster.filter(p=>p.position===pos).length<n).map(([pos,n])=>`${pos} (${Math.max(0,n-roster.filter(p=>p.position===pos).length)} needed)`)}
export function orderedRoster(roster,depth={}){return [...roster].sort((a,b)=>{if(a.position!==b.position)return a.position.localeCompare(b.position);const order=depth[a.position]||[];const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)||b.overall-a.overall})}
export function fieldPlayers(roster,depth={}){return depthStarters(roster,depth,'Offense')}
export const LIBRARY_PLAYS=Object.keys(FORMATIONS).flatMap(formation=>['Slants','Curls','Outs','Posts','Corners','Verticals','Flood','Inside zone','Outside run','QB keeper'].map((concept,index)=>{
 const run=index>=7,pattern=['Slant','Curl','Out','Post','Corner','Go'][index]||'Flat';const routes={};
 for(const slot of ['WR1','WR2','WR3','TE','RB'])routes[slot]=presetRoute(formation,slot,index===6?(slot==='WR1'?'Go':slot==='WR2'?'Corner':'Flat'):pattern);
 for(const slot of ['LT','LG','C','RG','RT']){const t=FORMATIONS[formation].find(t=>t[0]===slot);routes[slot]=[[t[1],t[2]],[t[1],t[2]+(run?-8:5)]];}
 if(run){const runner=index===9?'QB':'RB',t=FORMATIONS[formation].find(t=>t[0]===runner);routes[runner]=[[t[1],t[2]],[index===8?83:t[1],58],[index===8?86:t[1]+3,38]];}
 return {...makePlay(`library-${formation}-${index}`,`${formation} ${concept}`,formation,run?'run':'pass',routes),runner:index===9?'QB':'RB'};
}));

// A line-wide protection call preserves receiver routes and the QB progression.
export function passProtection(play){const routes={...play.routes};for(const [slot,x,y] of offensiveAlignment(play))if(['LT','LG','C','RG','RT'].includes(slot))routes[slot]=[[x,y],[x,y+5]];return {...play,routes};}

// Move the entire route with its release point, preserving every authored cut.
export function anchoredRoute(play,slot){
 const points=play.routes?.[slot];if(!points?.length)return [];
 const start=offensiveAlignment(play).find(p=>p[0]===slot)?.slice(1)||points[0];
 const dx=start[0]-points[0][0],dy=start[1]-points[0][1];
 return points.map(([x,y])=>[x+dx,y+dy]);
}
export function routeDragPoint(pointer,origin,feet){return {x:feet.x+pointer.x-origin.x,y:feet.y+pointer.y-origin.y};}
