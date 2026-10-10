import {MatchHelmet} from './ActiveFriendGames.jsx';
import './activeFriendGames.css';
import {ConnectedGame as OnlineMatch} from './ConnectedGame.jsx';
import {DefensivePlaybook} from './DefensivePlaybook.jsx';
import {TeamHelmet} from './TeamIdentity.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,Users,Send,RefreshCw,Copy,Play,X} from 'lucide-react';
import {multiplayerApi as defaultApi} from './multiplayerApi';
import {normalizePhone} from './phoneAuth';
import {DEFAULT_PLAYS,LIBRARY_PLAYS,DEFENSES,ELIGIBLE,offensiveAlignment,routeDragPoint,missingPositions} from './playbook';
import {All22Field} from './All22Field';
import {specialLineup} from './specialTeams';
import {lineup,designPoint,interpolateFrame} from './liveSimulation';
import {toOffenseYards} from './engine/field';
import {fieldPalettes,NFL_COLORS} from './teamColors';
import {withTackleFinish} from './tacklePlayback';
import {withIncompleteBounce} from './incompletePlayback';
import {withTouchdownCelebration} from './touchdownPlayback';
import './multiplayer.css';

export function Multiplayer({players,plays=DEFAULT_PLAYS,franchise,setFranchise,initialMatchId,inboxOnly=false,apiClient=defaultApi}){
 const api=apiClient;
 const [profile,setProfile]=useState(undefined),[name,setName]=useState(''),[handle,setHandle]=useState(''),[discoverable,setDiscoverable]=useState(true);
 const [matches,setMatches]=useState([]),[current,setCurrent]=useState(null),[query,setQuery]=useState(''),[results,setResults]=useState([]),[phone,setPhone]=useState(''),[share,setShare]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [coach,setCoach]=useState(null);
 const [notice,setNotice]=useState('');const intent=useRef(initialMatchId||(!inboxOnly&&new URLSearchParams(location.search).get('invite')));
 const owned=new Set(franchise?.roster?.map(p=>p.id)||[]),roster=players.filter(p=>owned.has(p.id));
 const missing=missingPositions(roster);
 const team={name:franchise?.name,identity:franchise?.teamIdentity,ids:roster.map(p=>p.id),depth:Object.fromEntries(Object.entries(franchise?.depth||{}).map(([slot,ids])=>[slot,ids.filter(id=>owned.has(id))])),primary:franchise?.color,secondary:franchise?.secondaryColor,tertiary:franchise?.tertiaryColor};
 async function refresh(){const [p,m]=await Promise.all([api('profile'),api('matches')]);setProfile(p);setMatches(m)}
 useEffect(()=>{let alive=true;async function poll(){try{const [p,m]=await Promise.all([api('profile'),api('matches')]);if(!alive)return;setProfile(p);setMatches(m);setError('');if(intent.current&&p){const id=intent.current;intent.current=null;setCurrent(await api(`matches/${id}`))}}catch(e){if(alive)setError(e.message)}}poll();const timer=setInterval(()=>{if(!document.hidden)poll()},20000);return()=>{alive=false;clearInterval(timer)}},[]);
 async function task(fn){if(busy)return;setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function saveProfile(e){e.preventDefault();await task(async()=>{setProfile(await api('profile',{name,handle,discoverable}));await refresh()})}
 async function invite(target){await task(async()=>{const number=target?null:normalizePhone(phone);const result=await api('matches',{franchise:team,...(target?{target}:{phone:number})});setShare({...result,phone:number});setNotice('Challenge created. Your friend can accept from their inbox after signing in.');await refresh()})}
 async function open(id){await task(async()=>setCurrent(await api(`matches/${id}`)))}
 async function viewCoach(uid){await task(async()=>{setCoach(await api(`players/${encodeURIComponent(uid)}`));window.scrollTo(0,0)})}
 const coachLink=(uid,label)=>uid&&!uid.startsWith('cpu:')?<button className="mp-coach-link" disabled={busy} onClick={()=>viewCoach(uid)}>{label} · Profile</button>:<span>{label}</span>;
 const activeMatches=matches.filter(m=>m.status==='active'||m.status==='invited');
 const pastMatches=matches.filter(m=>m.status!=='active'&&m.status!=='invited');
 const matchRow=m=><article className="home-match-card" key={m.id}><span className={`home-match-turn ${m.submitted?'waiting':''}`}>{m.status==='active'?(m.submitted?'Waiting for opponent':'Your turn'):m.status==='invited'?(m.side==='home'?'Invitation sent':'Invitation for you'):m.status}</span><div className="home-match-teams"><div><MatchHelmet franchise={m.hostFranchise} team={m.hostTeam}/><strong>{m.hostTeam}</strong>{coachLink(m.host,m.hostName)}</div><div className="home-match-score"><b>{m.game?`${m.game.state.score.home} – ${m.game.state.score.away}`:'VS'}</b><small>{m.game?`Q${m.game.state.quarter}`:'Challenge'}</small></div><div><MatchHelmet franchise={m.guestFranchise} team={m.guestTeam||'Opponent'}/><strong>{m.guestTeam||'Opponent'}</strong>{m.guest&&coachLink(m.guest,m.guestName)}</div></div><button className="primary" onClick={()=>open(m.id)} disabled={busy}>{m.status==='invited'?'View invitation':m.status==='active'?'Resume game':'View game'}</button>{m.status==='invited'&&m.side==='home'&&<button onClick={()=>task(async()=>{await api(`matches/${m.id}/cancel`,{revision:m.revision});await refresh()})} disabled={busy}>Cancel invitation</button>}</article>;

 const chooseTeam=<div className="mp-franchise"><TeamHelmet identity={franchise?.teamIdentity} size={80}/><div><strong>{franchise?.name||'Your franchise'}</strong><p>{roster.length} signed players · Your roster and starters</p>{missing.length>0&&<p role="status">Complete your lineup in the roster page: {missing.join(', ')}.</p>}</div></div>;
 if(coach)return <section className="mp-hub"><button onClick={()=>setCoach(null)}><ArrowLeft size={18}/>Back to Friends</button><article className="mp-card"><span className="eyebrow">COACH PROFILE</span><h2>{coach.name}</h2><p>@{coach.handle}</p><div className="mp-profile-stats">{[['Record',`${coach.stats.wins}–${coach.stats.losses}–${coach.stats.ties}`],['Games finished',coach.stats.games],['Active games',coach.stats.active],['Points scored',coach.stats.pointsFor],['Points allowed',coach.stats.pointsAgainst]].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><p>Multiplayer and NEFL results. Practice games are not included. Forfeits count toward the record; points include completed games only.</p>{!coach.stats.games&&<p>No finished games yet.</p>}</article></section>;
 if(current?.status==='active'||current?.status==='complete'||current?.status==='forfeited')return <OnlineMatch franchise={franchise} setFranchise={setFranchise} initial={current} plays={plays} apiClient={apiClient} onClose={()=>{setCurrent(null);refresh().catch(e=>setError(e.message))}}/>;
 return <section className="mp-hub"><div className="mp-heading"><div><span className="eyebrow">PLAY ON YOUR SCHEDULE</span><h2>Friends & challenges</h2><p>Both players choose a play and snap. The game resolves the play. Come back when it’s your turn.</p></div><button aria-label="Refresh challenges" onClick={()=>task(refresh)} disabled={busy}><RefreshCw size={20}/></button></div>{error&&<p className="mp-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {profile===undefined?<p>Loading your player account…</p>:!profile?<form className="mp-card" onSubmit={saveProfile}><h3>Create your multiplayer identity</h3><label>Player name<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={32} required autoComplete="nickname"/></label><label>Username<input value={handle} onChange={e=>setHandle(e.target.value)} pattern="[A-Za-z][A-Za-z0-9_]{2,19}" minLength={3} maxLength={20} required autoCapitalize="none"/></label><label className="mp-check"><input type="checkbox" checked={discoverable} onChange={e=>setDiscoverable(e.target.checked)}/>Let registered players find my username. My phone number stays private.</label><button className="primary" disabled={busy}>Create player</button></form>:<>
 <p className="mp-identity">Playing as {coachLink(profile.uid,profile.name)} · @{profile.handle} <button onClick={()=>task(async()=>{setProfile(await api('profile',{name:profile.name,handle:profile.handle,discoverable:!profile.discoverable}))})} disabled={busy}>{profile.discoverable?'Hide from search':'Allow username search'}</button></p>
 {current&&<div className="mp-card"><h3>{current.side==='home'?'Your invitation':`${current.hostName} invited you`}</h3><p>{current.hostTeam} · {current.status==='invited'?'Quick game · one call per play':current.status}</p>{current.status==='invited'&&current.side!=='home'&&<>{chooseTeam}<button className="primary" disabled={busy||missing.length>0} onClick={()=>task(async()=>setCurrent(await api(`matches/${current.id}/accept`,{revision:current.revision,franchise:team})))}>Accept challenge</button><button disabled={busy} onClick={()=>task(async()=>{await api(`matches/${current.id}/decline`,{revision:current.revision});setCurrent(null);await refresh()})}>Decline</button></>}<button onClick={()=>setCurrent(null)}>Close</button></div>}
 <div className="mp-card"><h3>Active games & invitations</h3>{activeMatches.length?<div className="home-match-grid">{activeMatches.map(matchRow)}</div>:<p>No active games or invitations. Invite a friend below.</p>}</div>
 <div><div className="mp-card"><h3><Users size={22}/> Invite a friend</h3><p>Play with the team you built. Your roster, starters, helmet and colors are saved for this match.</p>{chooseTeam}<form onSubmit={e=>{e.preventDefault();task(async()=>setResults(await api(`players?q=${encodeURIComponent(query)}`)))}}><label>Find a registered player<input placeholder="Username (at least 3 characters)" value={query} onChange={e=>setQuery(e.target.value)} minLength={3} maxLength={20} required autoCapitalize="none"/></label><button disabled={busy}>Search players</button></form>{results.map(p=><div className="mp-search-result" key={p.uid}><div>{coachLink(p.uid,p.name)}<small>@{p.handle}</small></div><button disabled={busy||missing.length>0} onClick={()=>invite(p.uid)}>Challenge</button></div>)}<form onSubmit={e=>{e.preventDefault();invite()}}><label>Or invite by phone number<input type="tel" autoComplete="off" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="US mobile number" required/></label><button className="primary" disabled={busy||missing.length>0}><Send size={17}/>Create phone invitation</button></form><p className="mp-note">Creating an invitation does not send a text. You choose Send text below to open your messaging app. Carrier messaging charges may apply. Only the invited phone account can accept.</p></div>
 </div>
 {pastMatches.length>0&&<details className="mp-card"><summary>Past challenges ({pastMatches.length})</summary>{pastMatches.map(matchRow)}</details>}
 {share&&<div className="mp-card" role="status"><h3>Invitation ready</h3><p>The invitation expires in seven days. Your friend must sign in with the invited account.</p><div className="mp-share">{share.phone&&<a className="primary" href={`sms:${share.phone}${/iPad|iPhone|iPod/.test(navigator.userAgent)?'&':'?'}body=${encodeURIComponent(`Play a game of Playcall Football with me! ${share.url}`)}`}>Send text</a>}<button onClick={()=>task(async()=>{await navigator.clipboard.writeText(share.url);setNotice('Invitation link copied.')})}><Copy size={16}/>Copy invite link</button><button onClick={()=>setShare(null)}>Done</button></div></div>}
 </>}
 </section>;
}

export {ConnectedGame as OnlineMatch} from './ConnectedGame.jsx';
