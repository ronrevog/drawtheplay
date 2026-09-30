import {readFileSync,writeFileSync} from 'node:fs';
import {resolveLivePlay} from '../src/liveSimulation.js';
import {LIBRARY_PLAYS,DEFENSES} from '../src/playbook.js';
const players=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url))).players;
const teams=[...new Set(players.filter(p=>p.eligible).map(p=>p.team))].sort();
const roster=team=>players.filter(p=>p.eligible&&p.team===team);
const results=[];
for(let i=0;i<240;i++){
 const play=LIBRARY_PLAYS[Math.floor(i/4)%30],coverage=DEFENSES[i%4];
 const home=teams[(i*7)%teams.length];let away=teams[(i*11+5)%teams.length];if(away===home)away=teams[(teams.indexOf(home)+1)%teams.length];
 const r=resolveLivePlay({play,coverage,offense:roster(home),defense:roster(away),seed:`validation-v2-${i}`,spot:25});
 results.push({call:play.type,kind:r.kind,yards:r.yards,duration:r.duration,end:r.events.at(-1).type,pressure:r.metrics.firstPressure,throwTime:r.metrics.timeToThrow,blockSeconds:r.metrics.blockedSeconds});
}
const mean=(rows,key)=>Number((rows.reduce((n,r)=>n+r[key],0)/Math.max(1,rows.length)).toFixed(2));
const pass=results.filter(r=>r.call==='pass'),run=results.filter(r=>r.call==='run');
const report={modelVersion:2,scope:'240 synthetic plays across 32 NFL rosters, all 30 library plays and 4 defensive looks. This is a behavior audit, not a statistical fit to NFL outcomes.',plays:results.length,passPlays:pass.length,runPlays:run.length,outcomes:results.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{}),meanPassYards:mean(pass,'yards'),meanRunYards:mean(run,'yards'),meanTimeToThrow:mean(pass.filter(r=>r.throwTime!==null),'throwTime'),pressuredPassPlays:pass.filter(r=>r.pressure!==null).length,meanSummedBlockSeconds:mean(results,'blockSeconds'),meanDuration:mean(results,'duration'),forcedWhistles:results.filter(r=>r.end==='Whistle').length};
writeFileSync(new URL('../simulation-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
