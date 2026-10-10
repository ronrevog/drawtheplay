import {FICTIONAL_TEAMS} from './teamIdentities.js';
export const NEFL_TEAMS=FICTIONAL_TEAMS;
// Nine conference opponents, then one cross-conference game. Every club gets 5 home / 5 away.
export function schedule(){
 const games=[];
 for(let conference=0;conference<2;conference++){
  let ring=Array.from({length:10},(_,i)=>i);const teams=NEFL_TEAMS.slice(conference*10,conference*10+10);
  for(let week=1;week<=9;week++){
   for(let i=0;i<5;i++){const a=ring[i],b=ring[9-i],delta=(b-a+10)%10,home=delta<5||(delta===5&&a<5);games.push({week,home:teams[home?a:b].id,away:teams[home?b:a].id})}
   ring=[ring[0],ring[9],...ring.slice(1,9)];
  }
 }
 for(let i=0;i<10;i++){const a=NEFL_TEAMS[i].id,b=NEFL_TEAMS[10+(i+5)%10].id;games.push({week:10,home:i<5?b:a,away:i<5?a:b})}
 return games.sort((a,b)=>a.week-b.week);
}
export function standings(games){const rows=NEFL_TEAMS.map((t,i)=>({...t,conference:i<10?'National':'Electronic',w:0,l:0,t:0,pf:0,pa:0}));for(const g of games.filter(g=>g.score&&g.week<=10)){const h=rows.find(t=>t.id===g.home),a=rows.find(t=>t.id===g.away);h.pf+=g.score.home;h.pa+=g.score.away;a.pf+=g.score.away;a.pa+=g.score.home;if(g.score.home===g.score.away){h.t++;a.t++}else{(g.score.home>g.score.away?h:a).w++;(g.score.home>g.score.away?a:h).l++}}return rows.sort((a,b)=>(b.w+b.t/2)-(a.w+a.t/2)||(b.pf-b.pa)-(a.pf-a.pa)||b.pf-a.pf||a.id.localeCompare(b.id))}
export function playoffGames(games,week){if(week===11)return ['National','Electronic'].flatMap(c=>{const r=standings(games).filter(t=>t.conference===c);return [[0,3],[1,2]].map(([a,b])=>({week,home:r[a].id,away:r[b].id}))});const winners=games.filter(g=>g.week===week-1).map(g=>g.score.home>g.score.away?g.home:g.away);return Array.from({length:winners.length/2},(_,i)=>({week,home:winners[i*2],away:winners[i*2+1]}))}
export const weekName=w=>w<=10?`Week ${w} of 10`:w===11?'Conference semifinals':w===12?'Conference championships':'NEFL Championship';
