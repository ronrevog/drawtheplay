import React,{useState} from 'react';
import {BrandMark} from './BrandMark';
import {FICTIONAL_TEAMS,PRO_TEAMS,findIdentity,selectIdentity,proIdentity} from './teamIdentities.js';
export function TeamHelmet({identity,code,size=100}){
 const team=findIdentity(identity)||proIdentity(code);
 return team?<img className="team-helmet" src={team.helmet} width={size} height={size} alt={`${team.name} helmet`} loading="lazy"/>:<BrandMark size={size}/>;
}
export function TeamIdentity({state,setState}){
 const selected=findIdentity(state.teamIdentity);
 const [group,setGroup]=useState(selected?.kind||'fictional');
 return <section className="game-panel identity-panel"><span className="eyebrow">TEAM IDENTITY</span><h2>Choose your team. Take the field.</h2>
  <div className="identity-current"><TeamHelmet identity={selected?.id} size={150}/><div><h3>{state.name}</h3><p>{selected?'Preset identity · fixed team colors':'Custom franchise · your name and colors'}</p><div className="team-color-preview" aria-label="Team color palette">{['color','secondaryColor','tertiaryColor'].map(key=><i key={key} style={{background:state[key]}}/>)}</div></div></div>
  <div className="identity-tabs" aria-label="Team collections">{[['fictional','Original teams · 20'],['pro','Pro colors · 32'],['custom','Custom team']].map(([id,label])=><button key={id} aria-pressed={group===id} onClick={()=>setGroup(id)}>{label}</button>)}</div>
  {group==='custom'?<div className="custom-identity">{selected?<><p>Use a custom identity to choose your own name and colors.</p><button className="secondary" onClick={()=>setState(s=>selectIdentity(s,null))}>Use custom team</button></>:<><label className="setting-label">Franchise name<input value={state.name} maxLength={30} onChange={e=>setState(s=>({...s,name:e.target.value}))}/></label><div className="team-color-controls">{[['color','Primary','#387bff'],['secondaryColor','Secondary','#f4f6fb'],['tertiaryColor','Accent','#ff653d']].map(([key,label,fallback])=><label className="setting-label" key={key}>{label}<input type="color" value={state[key]||fallback} onChange={e=>setState(s=>({...s,[key]:e.target.value}))}/><small>{state[key]||fallback}</small></label>)}</div></>}</div>:<><p className="muted">{group==='fictional'?'Original mascots and ready-to-play palettes. Select a helmet to use that team.':'Team colors on blank-sided helmets. No pro team or league logos.'}</p><div className="identity-grid">{(group==='fictional'?FICTIONAL_TEAMS:PRO_TEAMS).map(team=><button key={team.id} className={`identity-card ${selected?.id===team.id?'selected':''}`} aria-label={`Choose ${team.name}`} aria-pressed={selected?.id===team.id} onClick={()=>setState(s=>selectIdentity(s,team.id))} style={{'--identity-color':team.primary}}><TeamHelmet identity={team.id} size={130}/><strong>{team.name}</strong><span className="identity-swatches" aria-label={`${team.name} colors`}>{[team.primary,team.secondary,team.tertiary].map((color,i)=><i key={i} style={{background:color}}/>)}</span>{selected?.id===team.id&&<small>SELECTED</small>}</button>)}</div></>}
 </section>;
}
