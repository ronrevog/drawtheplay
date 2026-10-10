import React,{useEffect,useState} from 'react';
import {TeamHelmet} from './TeamIdentity.jsx';
import {multiplayerApi} from './multiplayerApi';

export function MatchHelmet({franchise,team}){
 if(franchise?.identity||!franchise?.primary)return <TeamHelmet identity={franchise?.identity} code={team} size={80}/>;
 return <svg width="80" height="80" viewBox="0 0 100 100" role="img" aria-label={`${team} helmet`}><path d="M14 59V44a34 34 0 0 1 68 0v18H49L36 76H17Z" fill={franchise.primary} stroke={franchise.secondary} strokeWidth="4"/><path d="M53 51h33v29H59L49 64M65 54v24M84 65H54" fill="none" stroke={franchise.secondary} strokeWidth="5" strokeLinejoin="round"/></svg>;
}

export function ActiveFriendGames({onOpen}){
 const [matches,setMatches]=useState([]),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let alive=true;
  async function refresh(){if(document.hidden)return;try{const rows=await multiplayerApi('matches');if(alive){setMatches(rows.filter(m=>m.status==='active').sort((a,b)=>Number(a.submitted)-Number(b.submitted)));setError('')}}catch(e){if(alive&&e.status!==401)setError('Active games could not be loaded.')}}
  refresh();const timer=setInterval(refresh,20000);document.addEventListener('visibilitychange',refresh);
  return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',refresh)};
 },[retry]);
 if(!matches.length&&!error)return null;
 return <section className="home-friend-games" aria-label="Active multiplayer games"><div className="section-head"><div><span className="eyebrow">BACK ON THE FIELD</span><h2>Your active games</h2></div><span>{matches.length} in progress</span></div>{error&&<p role="status">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}<div className="home-match-grid">{matches.map(m=><article key={m.id} className="home-match-card"><span className={`home-match-turn ${m.submitted?'waiting':''}`}>{m.submitted?'Waiting for your friend':'Your turn'}</span><div className="home-match-teams"><div><MatchHelmet franchise={m.hostFranchise} team={m.hostTeam}/><strong>{m.hostTeam}</strong><small>{m.hostName}</small></div><div className="home-match-score"><b>{m.game?.state.score.home??0} – {m.game?.state.score.away??0}</b><small>Q{m.game?.state.quarter??1}</small></div><div><MatchHelmet franchise={m.guestFranchise} team={m.guestTeam}/><strong>{m.guestTeam}</strong><small>{m.guestName}</small></div></div><button className="primary" onClick={()=>onOpen(m.id)}>{m.submitted?'Open game':'Resume game'} <span aria-hidden="true">↗</span></button></article>)}</div></section>;
}
