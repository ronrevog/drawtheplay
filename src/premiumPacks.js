// Fixed edition: completed 2025 season statistics in the bundled nflverse catalog.
// MVP award sources: https://www.nfl.com/_amp/matthew-stafford-rams-qb-most-valuable-player-2025
// https://www.nfl.com/news/bills-qb-josh-allen-wins-2024-ap-nfl-most-valuable-player-award
// https://www.nfl.com/videos/lamar-jackson-wins-2023-ap-most-valuable-player
export const PREMIUM_SEASON=2025;
export const PREMIUM_PACKS=[
 {id:'mvp-royalty',name:'MVP Royalty',cost:30,color:'#e9bf62',description:'The 2025, 2024 and 2023 AP NFL MVP winners.',ids:['00-0026498','00-0034857','00-0034796']},
 {id:'sack-exchange',name:'Sack Exchange',cost:25,color:'#70e6b4',description:'The top three sack leaders from the 2025 season.',stat:'def_sacks',unit:'sacks'},
 {id:'quarterback-club',name:'Quarterback Club',cost:30,color:'#81afff',description:'The three highest-rated quarterbacks in this catalog.',position:'QB',rating:true},
 {id:'house-call',name:'House Call',cost:22,color:'#ff9970',description:'The top three running backs by 2025 rushing touchdowns.',position:'RB',stat:'rushing_tds',unit:'rush TDs'},
 {id:'air-superiority',name:'Air Superiority',cost:22,color:'#83e3f5',description:'The top three receivers by 2025 receiving yards.',position:'WR',stat:'receiving_yards',unit:'rec yards'},
 {id:'no-fly-zone',name:'No Fly Zone',cost:20,color:'#c3a0ff',description:'The top three defensive backs by 2025 interceptions.',position:'DB',stat:'def_interceptions',unit:'INTs'},
 {id:'trench-kings',name:'Trench Kings',cost:18,color:'#e2ae85',description:'The highest-rated tackle, guard and center. Ratings are role estimates.',line:true},
 {id:'triple-crown',name:'Triple Crown',cost:28,color:'#b5e5cc',description:'The 2025 passing, rushing and receiving yardage leaders.',leaders:['passing_yards','rushing_yards','receiving_yards']}
];
const ratingOrder=(a,b)=>b.overall-a.overall||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
const statValue=(p,key)=>p.seasonStats?.[PREMIUM_SEASON]?.[key];
function leaders(players,key,count=3){return players.filter(p=>Number.isFinite(statValue(p,key))&&statValue(p,key)>0).sort((a,b)=>statValue(b,key)-statValue(a,key)||ratingOrder(a,b)).slice(0,count)}
export function premiumLineup(pack,players){
 if(pack.ids)return pack.ids.map(id=>players.find(p=>p.id===id)).filter(Boolean);
 if(pack.line)return ['T','G','C'].map(pos=>players.filter(p=>p.position==='OL'&&p.detailPosition===pos).sort(ratingOrder)[0]).filter(Boolean);
 if(pack.leaders)return pack.leaders.flatMap(key=>leaders(players,key,1));
 const pool=players.filter(p=>!pack.position||p.position===pack.position);
 return pack.rating?[...pool].sort(ratingOrder).slice(0,3):leaders(pool,pack.stat);
}
export function premiumOffer(state,id,players){
 const pack=PREMIUM_PACKS.find(p=>p.id===id);if(!pack)throw Error('Unknown special pack.');
 const lineup=premiumLineup(pack,players);
 const known=new Set([...(state.unlocked||[]),...(state.premiumUnlocks||[]),...state.roster.map(r=>r.id),...players.filter(p=>p.starter&&p.eligible).map(p=>p.id)]);
 const fresh=lineup.filter(p=>!known.has(p.id));
 const complete=lineup.length===3&&new Set(lineup.map(p=>p.id)).size===3;
 return {pack,lineup,fresh,complete,cost:Math.ceil(pack.cost*fresh.length/3),claimed:(state.premiumPacks||[]).includes(id)};
}
export function openPremiumPack(state,id,players,selectedId){
 const offer=premiumOffer(state,id,players);
 if(offer.claimed)throw Error('This special pack has already been opened.');
 if(!offer.complete)throw Error('This edition needs all three featured players in the catalog.');
 if(!offer.fresh.length)throw Error('All three players are already available to you.');
 const selected=offer.fresh.find(p=>p.id===selectedId);
 if(!selected)throw Error('Choose one locked player from this pack.');
 if(state.tokens<offer.cost)throw Error('Not enough scouting tokens.');
 return {cards:[selected],state:{...state,tokens:state.tokens-offer.cost,
  unlocked:[...new Set([...state.unlocked,selected.id])],
  premiumUnlocks:[...new Set([...(state.premiumUnlocks||[]),selected.id])],
  premiumPacks:[...(state.premiumPacks||[]),id]}};
}

