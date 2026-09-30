import React from 'react';
import {recapPlayers,recapCommentary} from './playRecap.js';
export function PlayRecap({event,game,onClose,onReplay}){
 const players=recapPlayers(event,game);
 const headline=event.text?.includes('TOUCHDOWN')?'Touchdown!':({pass:'Pass complete',run:'On the ground',sack:'Quarterback sacked',interception:'Intercepted!',fumble:'Fumble!',incomplete:'Incomplete pass'})[event.kind]||'Special teams';
 return <section className="play-recap" aria-labelledby="recap-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
  <button className="recap-close" aria-label="Close play recap" onClick={onClose}>×</button>
  <span className="eyebrow">PLAY RECAP · Q{event.quarter}</span><h2 id="recap-title">{headline}</h2><p className="recap-summary">{event.text}</p>
  <p className="recap-commentary"><span>FROM THE BOOTH</span>{recapCommentary(event)}</p>
  <div className="recap-players">{players.map(p=><article className={`recap-player ${p.side}`} key={`${p.side}-${p.id}`}><div className="recap-photo"><span aria-hidden="true">{p.number||p.position||p.slot}</span>{p.photo&&<img src={p.photo} alt={p.name} onError={e=>{e.currentTarget.style.display='none'}}/>}</div><span className="recap-role">{p.roles.join(' · ')}</span><h3>{p.name}</h3><small>{p.position||p.slot} · {(p.side==='offense')===(event.side==='home')?game.name:game.opponent}</small></article>)}</div>
  <div className="recap-actions">{onReplay&&<button onClick={onReplay}>Replay play</button>}<button className="primary" onClick={onClose}>{game.completed?'View final results':'Next play'}</button></div>
 </section>
}

