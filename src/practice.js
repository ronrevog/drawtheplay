import {emptyBox,recordSnap,awardAchievements} from './gameStats.js';
import {resolveSpecialTeams} from './specialTeams.js';
import {resolveLivePlay} from './liveSimulation.js';
import {createRng} from './engine/rng.ts';
import {createInitialState,GAME_PRESETS} from './engine/state.ts';
import {otherSide,fromOffenseYards,advanceBall,toOffenseYards,fieldGoalDistance} from './engine/field.ts';
import {resolveDowns,newSeries} from './engine/rules/downs.ts';
import {scoreTouchdown,scoreSafety,resolveExtraPoint,resolveTwoPoint,attemptFieldGoal,toKickoff} from './engine/rules/scoring.ts';
import {resolveKickoff,resolvePunt,resolveTurnover} from './engine/rules/kicking.ts';
import {DEFAULT_PLAYS,LIBRARY_PLAYS,DEFENSES,routeRead,missingPositions,fieldPlayers,orderedRoster,validPlay} from './playbook.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const average=(ps)=>ps.length?ps.reduce((s,p)=>s+p.overall,0)/ps.length:60;
export function startPractice(home,away,name,opponent,seed,depth={}){if(missingPositions(away).length)throw Error('This opponent has an incomplete roster in the current feed. Choose another team.');if(missingPositions(home).length)throw Error('Complete your lineup before kickoff.');return {id:String(seed),seed:String(seed),state:createInitialState(GAME_PRESETS.Quick,'home'),home:structuredClone(orderedRoster(home,depth)),away:structuredClone(orderedRoster(away)),depth:structuredClone(depth),name,opponent,log:[],last:null,completed:false,boxScore:emptyBox()};}
function clockAfter(s,elapsed){let next={...s,clock:Math.max(0,s.clock-elapsed)};if(next.clock===0&&next.phase!=='PAT'){if(next.quarter>=4)return {...next,phase:'GameOver'};next={...next,quarter:next.quarter+1,clock:next.config.quarterSeconds};if(next.quarter===3)next={...toKickoff(next,'home'),timeouts:{home:2,away:2}};}return next;}
export function simulateSnap(game,call={}){
 const before=game.state;if(before.phase==='GameOver')return game;
 const rng=createRng(`${game.seed}/${before.turn}`);const side=before.possession;const offense=side==='home'?game.home:game.away;const defense=side==='home'?game.away:game.home;
 const f=fieldPlayers(offense,side==='home'?game.depth:{}),qb=f.QB;const defensiveOrder=orderedRoster(defense,side==='away'?game.depth:{});const unit=(pos,n)=>defensiveOrder.filter(p=>p.position===pos).slice(0,n);const ownK=offense.find(p=>p.position==='K');const kicker={id:ownK?.id,kickPower:ownK?.overall||60,kickAccuracy:ownK?.overall||60};const returner={speed:average(defense.filter(p=>['RB','WR'].includes(p.position))),elusiveness:75};
 const play=side==='home'?(call.play||DEFAULT_PLAYS[0]):rng.pick(LIBRARY_PLAYS);if(!validPlay(play))throw Error('Invalid play definition.');
 const coverage=call.coverage||rng.pick(DEFENSES);if(!DEFENSES.includes(coverage))throw Error('Choose a defensive call.');
 let action=side==='home'?(call.action||'snap'):'snap';if(side==='away'&&before.phase==='Scrimmage'&&before.down===4)action=fieldGoalDistance(before.yardLine,side)<=53?'fg':'punt';
 let s=before,result,seconds=0,yards=0,text='',kind='',playerId=null,simulation=null;
 const special=before.phase==='Kickoff'?'kickoff':before.phase==='PAT'&&action!=='two'?'pat':before.phase==='Scrimmage'&&['fg','punt'].includes(action)?action:null;
 if(special){result=resolveSpecialTeams({state:before,type:special,offense,defense,seed:`${game.seed}/${before.turn}/special`,depth:side==='home'?game.depth:{}});s=result.state;simulation=result.simulation;seconds=result.seconds;text=result.text;kind='kick';}
 else if(before.phase==='PAT'){result=resolveTwoPoint(s,rng.chance(.45+(average(offense)-average(defense))*.005),0);s=result.state;text=`Two-point try ${s.score[side]>before.score[side]?'converted':'stopped'}`;kind='kick';}
 else{
  simulation=resolveLivePlay({play,coverage,offense,defense,defensePlan:side==='away'?(call.defensePlan??game.defenseDraft):undefined,offDepth:side==='home'?game.depth:{},defDepth:side==='away'?game.depth:{},seed:`${game.seed}/${before.turn}/live`,spot:toOffenseYards(before.yardLine,side)});
  ({kind,yards,playerId}=simulation);
  text=kind==='run'?`${simulation.playerName} runs for ${yards} yards`:kind==='pass'?`${simulation.qbName} → ${simulation.playerName} · ${yards} yards · read ${simulation.readOrder}`:kind==='sack'?`${simulation.qbName} sacked for ${-yards} yards`:kind==='interception'?`Pass intercepted by ${simulation.playerName}`:kind==='fumble'?`${simulation.playerName} fumbles`: `Incomplete · ${coverage}`;
  if(['interception','fumble'].includes(kind)){result=resolveTurnover(s,clamp(advanceBall(s.yardLine,side,yards),0,100),0,0);s=result.state;text=kind==='fumble'?`${simulation.playerName} fumbles · defense recovers`:text;}
  else{const downs=resolveDowns(s,yards);yards=downs.yards;if(downs.kind==='Touchdown'){s=scoreTouchdown(s,side,0,playerId).state;text+= ' · TOUCHDOWN!';}else if(downs.kind==='Safety'){s=scoreSafety(s,side,0).state;text+=' · SAFETY';}else{s={...s,...downs.next};if(downs.kind==='FirstDown')text+=' · first down';if(downs.kind==='TurnoverOnDowns')text+=' · turnover on downs';}}
  const stopped=['incomplete','interception','fumble'].includes(kind)||simulation.events.at(-1)?.type==='Out of bounds';
  seconds=Math.ceil(simulation.duration)+(stopped?0:rng.int(16,25));
 }
 if(game.timeoutPending&&before.phase==='Scrimmage')seconds=Math.min(seconds,simulation?Math.ceil(simulation.duration):8);
 const boxScore=recordSnap(game.boxScore,{before,after:s,simulation,play,kind,yards});
 s=clockAfter({...s,turn:before.turn+1},seconds);
 const event={turn:before.turn,quarter:before.quarter,clock:before.clock,side,kind,text,yards,playerId,playName:play.name,play:structuredClone(play),coverage,spot:toOffenseYards(before.yardLine,side),afterSpot:toOffenseYards(s.yardLine,s.possession),score:{...s.score}};
 return {...game,boxScore,timeoutPending:false,state:s,last:{...event,simulation},log:[event,...game.log],completed:s.phase==='GameOver'};
}
export function useTimeout(game){const s=game.state;if(s.phase==='GameOver'||s.timeouts.home<=0)throw Error('No timeouts available.');return {...game,timeoutPending:true,state:{...s,timeouts:{...s.timeouts,home:s.timeouts.home-1}},log:[{turn:s.turn,quarter:s.quarter,clock:s.clock,side:'home',kind:'timeout',text:'Your team takes a timeout.',score:{...s.score}},...game.log]};}
export function finalize(franchise,game){
 if(!game.completed)return {...franchise,game};const history=franchise.history||[];
 if(history.some(g=>g.id===game.id))return {...franchise,game};
 const result=game.state.score.home>game.state.score.away?'W':game.state.score.home<game.state.score.away?'L':'T';
 const entry={id:game.id,name:game.name,opponent:game.opponent,score:{...game.state.score},result,turns:game.state.turn,completedAt:new Date().toISOString(),boxScore:game.boxScore?structuredClone(game.boxScore):null};
 const nextHistory=[entry,...history],award=awardAchievements(nextHistory,franchise.achievements||[]);entry.achievements=award.unlocked.map(a=>a.id);entry.achievementCredits=award.credits;
 return {...franchise,game,credits:franchise.credits+award.credits,achievements:award.claimed,tokens:franchise.tokens+(result==='W'?2:1),history:nextHistory};
}
