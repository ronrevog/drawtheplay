import React,{useEffect,useRef,useState} from 'react';
import {FullFieldGame} from './FullFieldGame.jsx';
import {StatsHub} from './StatsHub.jsx';
import {initialState} from './economy.js';
import {fieldPalettes} from './teamColors.js';
import {withTackleFinish} from './tacklePlayback.js';
import {withIncompleteBounce} from './incompletePlayback.js';
import {withTouchdownCelebration} from './touchdownPlayback.js';
import {multiplayerApi} from './multiplayerApi.js';

// Network transport only. All field controls and playback live in FullFieldGame.
export function ConnectedGame({initial,plays,franchise,setFranchise,onClose,apiClient=multiplayerApi}){
 const [match,setMatch]=useState(initial),[preferences,setPreferences]=useState(()=>({...initialState(),...franchise,plays:plays||franchise?.plays||initialState().plays}));
 const [recording,setRecording]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stats,setStats]=useState(false),[loadingReplay,setLoadingReplay]=useState(!!initial.game.last);
 const current=useRef(initial),pending=useRef(false),alive=useRef(true),playing=useRef(false),draft=useRef(franchise?.connectedDrafts?.[initial.id]?.turn===initial.game.state.turn?franchise.connectedDrafts[initial.id].draft:{});
 const replayRequest=useRef(null),loadedTurn=useRef(-1);
 const cpu=!!initial.cpu||initial.host?.startsWith('cpu:')||initial.guest?.startsWith('cpu:');
 function decorate(game,m){return {...game,name:m.hostTeam,opponent:m.guestTeam,teamIdentity:m.hostFranchise?.identity,opponentIdentity:m.guestFranchise?.identity,completed:game.completed||m.status==='forfeited'}}
 async function receive(next,animate=true){
  if(!alive.current||next.revision<current.current.revision)return;
  const advanced=next.game.state.turn>current.current.game.state.turn;
  current.current=next;
  if(advanced)draft.current={};
  if(animate&&next.game.last&&next.game.last.turn>loadedTurn.current)await fetchReplay(next);
  else setMatch(next);
 }
 useEffect(()=>{alive.current=true;let polling=false;const poll=async()=>{if(document.hidden||pending.current||playing.current||polling)return;polling=true;try{await receive(await apiClient(`matches/${initial.id}`));}catch(e){if(alive.current)setError(e.message)}finally{polling=false}};poll();const timer=setInterval(poll,5000);window.addEventListener('focus',poll);return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('focus',poll)}},[initial.id]);

 async function action(kind,call={}){
  if(pending.current||replayRequest.current)return;pending.current=true;setBusy(true);setError('');
  try{let m=current.current;try{await receive(await apiClient(`matches/${m.id}/${kind}`,{revision:m.revision,turn:m.game.state.turn,...call}))}catch(e){if(e.status!==409)throw e;const fresh=await apiClient(`matches/${m.id}`);await receive(fresh);if(kind==='call'&&fresh.status==='active'&&!fresh.submitted&&fresh.game.state.turn===m.game.state.turn)await receive(await apiClient(`matches/${m.id}/call`,{revision:fresh.revision,turn:fresh.game.state.turn,...call}));else throw e}}
  finally{pending.current=false;if(alive.current)setBusy(false)}
 }
 async function fetchReplay(m,manual=false){
  if(replayRequest.current)return replayRequest.current;
  setLoadingReplay(true);
  const request=(async()=>{try{
   const r=await apiClient(`matches/${m.id}/replay`);
   if(!alive.current)return;
   if(!r?.event?.simulation?.frames?.length)throw Error('Animation is not ready yet.');
   if(r.event.turn!==current.current.game.last?.turn)return;
   if(!manual&&r.event.turn<=loadedTurn.current)return;
   const simulation=withTouchdownCelebration(withIncompleteBounce(withTackleFinish(r.event.simulation)));
   loadedTurn.current=r.event.turn;setError('');setMatch(m);
   setRecording({before:decorate(r.before,m),nextGame:decorate(m.game,m),simulation,duration:simulation.duration||2.3,event:r.event,play:r.play,coverage:r.event.coverage});
  }catch(e){if(alive.current)setError('Play saved. Retrying its animation… '+e.message)}finally{replayRequest.current=null;if(alive.current)setLoadingReplay(false)}})();
  replayRequest.current=request;return request;
 }
 async function loadReplay(){await fetchReplay(current.current,true)}

 const game={...decorate(match.game,match),...draft.current};
 const state={...preferences,game};
 function update(change){setPreferences(prev=>{const currentState={...prev,game:{...decorate(current.current.game,current.current),...draft.current}};const next=typeof change==='function'?change(currentState):change;if(next.game)draft.current={fieldDraft:next.game.fieldDraft,coverageDraft:next.game.coverageDraft,defenseDraft:next.game.defenseDraft};const settings=Object.fromEntries(['plays','fieldPresentation','playRecaps','defensiveCall'].map(k=>[k,next[k]]));if(setFranchise){const savedDraft=structuredClone(draft.current),turn=current.current.game.state.turn;queueMicrotask(()=>setFranchise(s=>({...s,...settings,connectedDrafts:Object.fromEntries([...Object.entries(s.connectedDrafts||{}).filter(([id])=>id!==initial.id).slice(-9),[initial.id,{turn,draft:savedDraft}]] )})));}return {...prev,...settings}})}
 const base=fieldPalettes(match.hostTeam,match.guestTeam,match.hostFranchise?.primary,'home');
 const home=match.hostFranchise||base.home,away=match.guestFranchise||base.away;
 const remote={side:match.side,locked:busy||loadingReplay||match.submitted,recording,replay:loadReplay,onPlayback:active=>{playing.current=active},snap:call=>action('call',call),timeout:()=>action('timeout'),palettes:side=>({home,away,offense:side==='home'?home:away,defense:side==='home'?away:home}),status:error||(loadingReplay?'Loading play animation…':busy?'Saving play…':match.submitted?'Snap submitted. Waiting for your opponent. You can leave and come back.':!cpu&&match.opponentSubmitted?'Your opponent is ready. Choose your play and snap.':'')};
 if(stats)return <section><button onClick={()=>setStats(false)}>Back to game</button><StatsHub state={{...preferences,game,history:[{id:game.id,name:game.name,opponent:game.opponent,score:game.state.score,result:game.state.score[match.side]>game.state.score[match.side==='home'?'away':'home']?'W':game.state.score.home===game.state.score.away?'T':'L',turns:game.state.turn,boxScore:game.boxScore}]}}/></section>;
 return <FullFieldGame state={state} setState={update} remote={remote} notify={setError} navigate={page=>page==='stats'?setStats(true):onClose()}/>;
}
