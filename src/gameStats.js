// Franchise game stats are separate from the imported NFL season statistics.
export const STAT_LABELS={games:'Games',snaps:'Snaps',blocks:'Blocks engaged',blocksShed:'Blocks shed',passAttempts:'Pass att',completions:'Comp',passingYards:'Pass yds',passingTDs:'Pass TD',interceptionsThrown:'INT thrown',rushAttempts:'Carries',rushingYards:'Rush yds',rushingTDs:'Rush TD',targets:'Targets',receptions:'Rec',receivingYards:'Rec yds',receivingTDs:'Rec TD',tackles:'Tackles',sacks:'Sacks',interceptions:'INT',fumblesLost:'Fumbles lost',fieldGoalAttempts:'FG att',fieldGoals:'FG made',extraPointAttempts:'XP att',extraPoints:'XP made',punts:'Punts',puntYards:'Punt yds',returns:'Returns',returnYards:'Return yds',returnTDs:'Return TD',thirdAttempts:'3rd att',thirdConversions:'3rd made',fourthAttempts:'4th att',fourthConversions:'4th made',firstDowns:'First downs',touchdowns:'Touchdowns',wins:'Wins',points:'Points',longestRush:'Long rush',longestReception:'Long rec'};
export function emptyBox(partial=false){return {version:1,partial,home:{team:{},players:{}},away:{team:{},players:{}}}}
const add=(row,key,value=1)=>{row[key]=(row[key]||0)+value};
export function recordSnap(previous,{before,after,simulation,play,kind,yards=0}){
 const box=structuredClone(previous||emptyBox(before.turn>0)),side=before.possession,opponent=side==='home'?'away':'home',own=box[side],other=box[opponent],sim=simulation;
 if(!sim)return box;
 const person=(slot,relative='offense')=>sim.people.find(p=>p.slot===slot&&p.side===relative);
 function row(p,teamSide){if(!p)return null;return box[teamSide].players[p.id] ||= {id:p.id,name:p.name,number:p.number,stats:{}}}
 function inc(p,teamSide,key,value=1){const r=row(p,teamSide);if(r)add(r.stats,key,value)}
 for(const p of sim.people)inc(p,p.side==='offense'?side:opponent,'snaps');
 for(const e of sim.events||[]){if(e.type==='Block engaged'||e.type==='Block shed'){const p=sim.people.find(p=>p.slot===e.by);if(p)inc(p,p.side==='offense'?side:opponent,e.type==='Block engaged'?'blocks':'blocksShed')}}
 const events=sim.events||[],find=type=>events.find(e=>e.type===type),scored=(after.score[side]||0)-(before.score[side]||0);
 if(sim.special){
 const k=person(sim.special==='punt'?'P':'K');
 if(sim.special==='fg'||sim.special==='pat'){const attempt=sim.special==='fg'?'fieldGoalAttempts':'extraPointAttempts',made=sim.special==='fg'?'fieldGoals':'extraPoints';inc(k,side,attempt);add(own.team,attempt);if(sim.good){inc(k,side,made);add(own.team,made)}}
 if(sim.special==='punt'){inc(k,side,'punts');add(own.team,'punts');const gross=Math.max(0,Math.round(sim.kickDistance+(sim.frames[0].players.find(p=>p.slot==='P')?.y||0)));inc(k,side,'puntYards',gross);add(own.team,'puntYards',gross)}
 if(find('Return')){const kr=person('KR','defense');inc(kr,opponent,'returns');inc(kr,opponent,'returnYards',sim.returnYards||0);add(other.team,'returns');add(other.team,'returnYards',sim.returnYards||0);if(sim.outcome==='Return touchdown'){inc(kr,opponent,'returnTDs');add(other.team,'returnTDs');add(other.team,'touchdowns')}}
 const tackle=find('Tackle');if(tackle?.by)inc(person(tackle.by),side,'tackles');
 }else if(before.phase==='Scrimmage'){
 add(own.team,'plays');const qb=person('QB'),caught=find('Catch'),td=scored===6;
 if(play.type==='pass'&&kind!=='sack'){
 inc(qb,side,'passAttempts');add(own.team,'passAttempts');const receiver=person(find('Throw')?.to||sim.targetSlot);if(receiver)inc(receiver,side,'targets');
 if(caught){const target=person(caught.by);inc(qb,side,'completions');inc(qb,side,'passingYards',yards);inc(target,side,'receptions');inc(target,side,'receivingYards',yards);const r=row(target,side);if(r)r.stats.longestReception=Math.max(r.stats.longestReception||0,yards);add(own.team,'completions');add(own.team,'passingYards',yards);if(td){inc(qb,side,'passingTDs');inc(target,side,'receivingTDs');add(own.team,'passingTDs')}}
 if(kind==='interception'){inc(qb,side,'interceptionsThrown');add(own.team,'interceptionsThrown');inc(person(find('Interception')?.by,'defense'),opponent,'interceptions');add(other.team,'interceptions')}
 }else if(play.type==='run'){
 const runner=person(find('Handoff')?.to||find('Keeper')?.to||'QB');inc(runner,side,'rushAttempts');inc(runner,side,'rushingYards',yards);const r=row(runner,side);if(r)r.stats.longestRush=Math.max(r.stats.longestRush||0,yards);add(own.team,'rushAttempts');add(own.team,'rushingYards',yards);if(td){inc(runner,side,'rushingTDs');add(own.team,'rushingTDs')}
 }
 if(kind==='sack'){add(own.team,'sacksAllowed');add(own.team,'sackYards',-yards);add(other.team,'sacks');const d=person(find('Sack')?.by,'defense');inc(d,opponent,'sacks');inc(d,opponent,'tackles')}
 else {const tackle=find('Tackle')||[...events].reverse().find(e=>e.type==='Contact');if(tackle?.by)inc(person(tackle.by,'defense'),opponent,'tackles')}
 if(kind==='fumble'){const f=person(find('Fumble')?.by);inc(f,side,'fumblesLost');add(own.team,'fumblesLost')}
 const converted=!['fumble','interception'].includes(kind)&&(td||(after.possession===side&&after.down===1&&yards>=before.distance));
 if(before.down===3||before.down===4){const prefix=before.down===3?'third':'fourth';add(own.team,`${prefix}Attempts`);if(converted)add(own.team,`${prefix}Conversions`)}
 if(converted){add(own.team,'firstDowns');if(td)add(own.team,'touchdowns')}
 }
 return box;
}
export function careerStats(history=[]){const result={team:{},players:{},trackedGames:0,partialGames:0};for(const game of history){if(!game.boxScore)continue;result.trackedGames++;if(game.boxScore.partial)result.partialGames++;const home=game.boxScore.home;for(const [key,n] of Object.entries(home.team))if(Number.isFinite(n))add(result.team,key,n);add(result.team,'games');if(game.result==='W')add(result.team,'wins');add(result.team,'points',game.score.home);
 for(const p of Object.values(home.players)){const target=result.players[p.id] ||= {id:p.id,name:p.name,number:p.number,stats:{}};add(target.stats,'games');for(const [key,n] of Object.entries(p.stats)){if(!Number.isFinite(n))continue;if(key.startsWith('longest'))target.stats[key]=Math.max(target.stats[key]||0,n);else add(target.stats,key,n)}}}return result}
const tier=(key,name,goals,rewards)=>goals.map((goal,i)=>({id:`${key}-${goal}`,key,name:`${name} ${i+1}`,goal,reward:rewards[i]}));
export const ACHIEVEMENTS=[
 ...tier('touchdowns','End zone regular',[5,25,100],[1500,5000,15000]),...tier('passingYards','Air attack',[500,2500,10000],[1000,4000,12000]),...tier('rushingYards','Ground game',[250,1000,5000],[1000,4000,12000]),...tier('passingTDs','Touchdown throws',[5,20,75],[1500,4500,12000]),...tier('rushingTDs','Power runner',[5,20,50],[1500,4500,10000]),...tier('thirdConversions','Move the chains',[10,50,150],[1500,4500,10000]),...tier('firstDowns','Keep the drive alive',[25,100,300],[1500,4000,10000]),...tier('sacks','Pressure unit',[5,25,75],[1500,5000,12000]),...tier('interceptions','Ball hawks',[3,10,30],[1500,4500,10000]),...tier('fieldGoals','Through the uprights',[5,20,50],[1000,3500,8000]),...tier('returnYards','Return specialist',[250,1000,3000],[1000,3500,8000]),...tier('wins','Winning franchise',[1,10,25],[1500,5000,10000])];
export function awardAchievements(history,claimed=[]){const totals=careerStats(history).team;const unlocked=ACHIEVEMENTS.filter(a=>!claimed.includes(a.id)&&(totals[a.key]||0)>=a.goal);return {unlocked,credits:unlocked.reduce((s,a)=>s+a.reward,0),claimed:[...new Set([...claimed,...unlocked.map(a=>a.id)])]}}
export function validBox(box){const object=x=>x&&typeof x==='object'&&!Array.isArray(x);const numbers=x=>object(x)&&Object.values(x).every(Number.isFinite);return Boolean(box?.version===1&&['home','away'].every(side=>object(box[side])&&numbers(box[side].team)&&object(box[side].players)&&Object.entries(box[side].players).every(([id,p])=>!['__proto__','constructor','prototype'].includes(id)&&object(p)&&p.id===id&&typeof p.name==='string'&&numbers(p.stats))))}
