import React,{useState} from 'react';
import {Sparkles,Check,Lock} from 'lucide-react';
import {PREMIUM_PACKS,premiumOffer,PREMIUM_SEASON} from './premiumPacks.js';

export function PremiumPacks({state,players,onBuy,onInspect}){
 const [choices,setChoices]=useState({});
 return <section className="premium-collection" aria-label="Special edition player packs">
  <div className="premium-heading"><div><span className="eyebrow">THE VAULT · {PREMIUM_SEASON} EDITION</span><h2>Three stars. One choice.</h2><p>Choose one featured player per special pack to unlock for signing.</p></div><span className="premium-seal">SPECIAL<br/>EDITIONS</span></div>
  <p className="premium-rules">Choose one player, then confirm your pick. Only that player unlocks; signing them still costs team credits. One choice per pack, per franchise—your pick is final. Already available players reduce the token price and cannot be chosen again. Special editions include signing rights for featured reserve players.</p>
  <div className="premium-grid">{PREMIUM_PACKS.map(pack=>{
   const offer=premiumOffer(state,pack.id,players),affordable=state.tokens>=offer.cost;
   const selected=offer.fresh.find(p=>p.id===choices[pack.id]);
   const disabled=offer.claimed||!offer.complete||!offer.fresh.length||!affordable||!selected;
   return <article className="premium-pack" style={{'--pack-accent':pack.color}} key={pack.id}>
    <div className="premium-art"><img src={`/packs/${pack.id}.png`} alt={`${pack.name} collectible pack cover`} loading="lazy"/><span className="premium-edition">{offer.claimed?'CHOICE USED':'CHOOSE 1 OF 3'}</span></div>
    <div className="premium-body"><h3>{pack.name}</h3><p className="premium-description">{pack.description}</p>
     <ul className="premium-lineup">{offer.lineup.map((player,i)=>{const fresh=offer.fresh.some(p=>p.id===player.id);const metric=pack.stat?`${player.seasonStats[PREMIUM_SEASON][pack.stat].toLocaleString()} ${pack.unit}`:pack.ids?`${2025-i} MVP`:`${player.overall} OVR`;return <li key={player.id} className={selected?.id===player.id?'premium-picked':''}><label className="premium-choice"><input type="radio" name={`pick-${pack.id}`} aria-label={`Choose ${player.name} from ${pack.name}`} checked={selected?.id===player.id} disabled={!fresh||offer.claimed||!offer.complete} onChange={()=>setChoices(prev=>({...prev,[pack.id]:player.id}))}/><span><strong>{player.name}</strong><small>{player.position} · {metric}</small></span>{!fresh&&<Check size={15} aria-label="Already available"/>}</label><button className="premium-profile" aria-label={`View ${player.name} profile`} onClick={()=>onInspect(player)}>View profile</button></li>})}</ul>
     <div className="premium-price"><span>{offer.cost!==pack.cost&&<del>{pack.cost}</del>}<Sparkles size={17}/><strong>{offer.cost}</strong> tokens</span><small>1 player unlock</small></div>
     <button className="premium-open" disabled={disabled} onClick={()=>onBuy(pack.id,selected.id)}>{offer.claimed?'Choice used':!offer.complete?'Lineup unavailable':!offer.fresh.length?'Lineup already unlocked':!affordable?<><Lock size={14}/>Need {offer.cost-state.tokens} more tokens</>:!selected?'Choose a player above':<>Unlock {selected.name}</>}</button>
    </div>
   </article>;
  })}</div>
  <p className="premium-footnote">Stat leaders use the bundled {PREMIUM_SEASON} regular-season data. Ties break by overall rating, then name. MVP Royalty features the AP winners for 2023–2025. Ratings and current teams come from your catalog.</p>
 </section>;
}
