import {withLegendPlayers} from '../src/legendPlayers.js';
import {findIdentity} from '../src/teamIdentities.js';
import {startPractice,simulateSnap} from '../src/practice.js';
import {orderedRoster,validPlay,DEFENSES,DEFAULT_PLAYS,missingPositions} from '../src/playbook.js';
import {formationRules} from '../src/offensiveFormation.js';

export function fail(message,status=400){throw Object.assign(new Error(message),{status})}
export function teamRoster(catalog,team){
 if(typeof team!=='string'||team.length>5)fail('Choose a team.');
 const roster=catalog.filter(p=>p.eligible&&p.team===team);
 if(!roster.length||missingPositions(roster).length)fail('This team has an incomplete lineup. Choose another.');
 return roster;
}
export function franchiseSnapshot(catalog,raw){
 if(!raw||!Array.isArray(raw.ids)||raw.ids.length>53||new Set(raw.ids).size!==raw.ids.length)fail('Send your built franchise roster.');
 const known=new Map(withLegendPlayers(catalog).map(p=>[p.id,p]));
 const roster=raw.ids.map(id=>known.get(id));
 if(roster.some(p=>!p?.eligible)||missingPositions(roster).length)fail('Complete your franchise lineup before challenging a friend.');
 const name=typeof raw.name==='string'?raw.name.trim().slice(0,30):'';if(!name)fail('Name your franchise first.');
 const identity=findIdentity(raw.identity),depth={};
 for(const [slot,ids] of Object.entries(raw.depth||{})){
  if(slot.length>12||!Array.isArray(ids)||ids.length>53||ids.some(id=>!raw.ids.includes(id)))fail('Invalid franchise depth chart.');
  depth[slot]=[...new Set(ids)];
 }
 const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value)?value:fallback;
 return {name,identity:identity?.id||null,ids:raw.ids,depth,primary:identity?.primary||color(raw.primary,'#387bff'),secondary:identity?.secondary||color(raw.secondary,'#f4f6fb'),tertiary:identity?.tertiary||color(raw.tertiary,'#ff653d')};
}
export function newGame(catalog,host,guest,seed){
 const known=withLegendPlayers(catalog);
 const roster=t=>typeof t==='string'?teamRoster(catalog,t):orderedRoster(t.ids.map(id=>known.find(p=>p.id===id)),t.depth);
 return {...startPractice(roster(host),roster(guest),host.name||host,guest.name||guest,seed,host.depth||{}),awayDepth:structuredClone(guest.depth||{})};
}
export function sanitizeCall(body,game,side){
 if(game.completed)fail('This game is over.',409);
 if(side!==game.state.possession){if(!DEFENSES.includes(body.coverage))fail('Choose a defensive coverage.');return {coverage:body.coverage}}
 const action=body.action||'snap';if(!['snap','punt','fg','two'].includes(action))fail('Invalid call.');
 if((['punt','fg'].includes(action)&&game.state.phase!=='Scrimmage')||(action==='two'&&game.state.phase!=='PAT'))fail('That call is not available now.');
 const raw=body.play||DEFAULT_PLAYS[0];
 if(!validPlay(raw)||raw.name.length>64||raw.id.length>100||JSON.stringify(raw).length>24000)fail('Invalid play.');
 // Only fields consumed by the engine are accepted. Ratings, results and seeds never come from clients.
 const play=Object.fromEntries(['id','name','formation','type','routes','reads','runner','target','positions','reports'].filter(k=>raw[k]!==undefined).map(k=>[k,raw[k]]));
 if(game.state.phase==='Scrimmage'&&action==='snap'){
  const formation=formationRules(play,game[side],{});if(!formation.legal)fail(formation.errors.join(' '));
  if(play.type==='pass'&&!formation.eligible.some(slot=>play.routes[slot]?.length>1))fail('Draw a receiver route.');
  if(play.type==='run'&&!play.routes[play.runner]?.length)fail('Draw the runner’s route.');
 }
 return {play,action};
}
export function resolveCalls(doc){
 const off=doc.game.state.possession,def=off==='home'?'away':'home';
 const call={...doc.calls[off],coverage:doc.calls[def].coverage,multiplayer:true};
 const before={...doc.game,last:null};
 const next=simulateSnap(before,call);
 const simulation=next.last?.simulation;
 doc.replay={before,call};doc.game={...next,last:next.last?{...next.last,simulation:undefined}:null,log:next.log.slice(0,80)};
 doc.calls={};if(next.completed)doc.status='complete';
 return simulation;
}
export function visibleMatch(row,uid){
 const doc=JSON.parse(row.doc);const side=row.host===uid?'home':row.guest===uid?'away':null;
 const game=doc.game?{...doc.game,id:row.id,seed:undefined}:null;
 return {id:row.id,revision:row.revision,status:row.status,host:row.host,guest:row.guest,
  hostName:doc.hostName,guestName:doc.guestName,hostTeam:doc.hostTeam,guestTeam:doc.guestTeam,
  hostFranchise:doc.hostFranchise?{...doc.hostFranchise,ids:undefined,depth:undefined}:null,guestFranchise:doc.guestFranchise?{...doc.guestFranchise,ids:undefined,depth:undefined}:null,
  side,game:side?game:null,submitted:side?!!doc.calls?.[side]:false,
  opponentSubmitted:side?!!doc.calls?.[side==='home'?'away':'home']:false,
  expires:row.expires,updated:row.updated,winner:doc.winner||null};
}
