import {identityFields} from './teamIdentities.js';
import {PREMIUM_PACKS} from './premiumPacks.js';
import {ACHIEVEMENTS,validBox} from './gameStats.js';
import {DEFAULT_PLAYS,validPlay} from './playbook.js';
export const STARTING_CREDITS=100000;
export const LIMIT=53;
export const ROSTER_TARGETS={QB:3,RB:4,WR:6,TE:3,OL:9,DL:9,LB:6,DB:10,K:1,P:1,LS:1};
export const MILESTONES=[10,20,30,40,53];
export const REQUIREMENTS={QB:1,RB:1,WR:3,TE:1,OL:5,DL:4,LB:3,DB:4,K:1,P:1,LS:1};
export const PACKS=[{id:'discovery',name:'Discovery',cost:1,count:3,min:60,max:80,description:'Find depth. Discover a new starter.',tone:'green'},{id:'contender',name:'Contender',cost:2,count:3,min:75,max:89,description:'Raise the ceiling of your roster.',tone:'blue'},{id:'elite',name:'Elite scouting',cost:4,count:2,min:85,max:99,description:'Make room for a difference-maker.',tone:'gold'}];
export function initialState(){return {teamIdentity:null,playRecaps:true,version:1,budgetVersion:2,credits:STARTING_CREDITS,tokens:5,roster:[],unlocked:[],premiumUnlocks:[],premiumPacks:[],milestones:[],name:'My franchise',color:'#387bff',secondaryColor:'#f4f6fb',tertiaryColor:'#ff653d',plays:structuredClone(DEFAULT_PLAYS),depth:{},history:[],achievements:[],game:null};}
export function restore(raw,players){
 try{const s=JSON.parse(raw);const ids=new Set(players.map(p=>p.id));if(s.version!==1||!Number.isFinite(s.credits)||s.credits<0||!Number.isInteger(s.tokens)||s.tokens<0||!Array.isArray(s.roster)||s.roster.length>LIMIT||!Array.isArray(s.unlocked)||!Array.isArray(s.milestones))throw Error();if(s.roster.some(r=>!ids.has(r.id)||!Number.isFinite(r.paid)||r.paid<0)||new Set(s.roster.map(r=>r.id)).size!==s.roster.length)throw Error();return {...initialState(),...s,playRecaps:s.playRecaps!==false,premiumPacks:Array.isArray(s.premiumPacks)?[...new Set(s.premiumPacks.filter(id=>PREMIUM_PACKS.some(p=>p.id===id)))]:[],premiumUnlocks:Array.isArray(s.premiumUnlocks)?[...new Set(s.premiumUnlocks.filter(id=>ids.has(id)&&s.unlocked.includes(id)))]:[],achievements:Array.isArray(s.achievements)?[...new Set(s.achievements.filter(id=>ACHIEVEMENTS.some(a=>a.id===id)))]:[],budgetVersion:2,credits:s.credits+(s.budgetVersion===2?0:25000),plays:Array.isArray(s.plays)&&s.plays.length&&s.plays.every(validPlay)?s.plays:structuredClone(DEFAULT_PLAYS),depth:s.depth&&typeof s.depth==='object'&&!Array.isArray(s.depth)?Object.fromEntries(Object.entries(s.depth).filter(([k,v])=>Array.isArray(v)&&v.every(id=>typeof id==='string'))):{},color:/^#[0-9a-f]{6}$/i.test(s.color)?s.color:'#387bff',secondaryColor:/^#[0-9a-f]{6}$/i.test(s.secondaryColor)?s.secondaryColor:'#f4f6fb',tertiaryColor:/^#[0-9a-f]{6}$/i.test(s.tertiaryColor)?s.tertiaryColor:'#ff653d',history:Array.isArray(s.history)?s.history.filter(h=>h&&typeof h.id==='string'&&typeof h.opponent==='string'&&['W','L','T'].includes(h.result)&&Number.isFinite(h.score?.home)&&Number.isFinite(h.score?.away)).map(h=>({...h,boxScore:validBox(h.boxScore)?h.boxScore:null})):[],game:s.game&&s.game.state&&Array.isArray(s.game.home)&&Array.isArray(s.game.away)&&Array.isArray(s.game.log)&&s.game.state.config&&['Kickoff','Scrimmage','PAT','GameOver'].includes(s.game.state.phase)&&Number.isFinite(s.game.state.clock)?{...s.game,boxScore:validBox(s.game.boxScore)?s.game.boxScore:undefined}:null,name:typeof s.name==='string'?s.name.slice(0,30):'My franchise',unlocked:[...new Set(s.unlocked.filter(id=>ids.has(id)))],milestones:s.milestones.filter(x=>MILESTONES.includes(x)),...identityFields(s.teamIdentity)};}catch{return initialState();}
}
export function recruit(s,p){
 if(!p.eligible&&!s.premiumUnlocks?.includes(p.id))throw Error('This player is not currently recruitable.');
 if(!p.starter&&!s.unlocked.includes(p.id))throw Error('Unlock this player through scouting first.');
 if(s.roster.some(r=>r.id===p.id))throw Error('Already on your roster.');
 if(s.roster.length>=LIMIT)throw Error('Your roster is full. Release a player first.');
 if(s.credits<p.cost)throw Error('Not enough team credits.');
 const roster=[...s.roster,{id:p.id,paid:p.cost}];const earned=MILESTONES.filter(n=>roster.length>=n&&!s.milestones.includes(n));
 return {...s,roster,credits:s.credits-p.cost,tokens:s.tokens+earned.length*2,milestones:[...s.milestones,...earned]};
}
export function release(s,id){const entry=s.roster.find(r=>r.id===id);if(!entry)throw Error('Player is not on your roster.');return {...s,credits:s.credits+entry.paid,roster:s.roster.filter(r=>r.id!==id),depth:Object.fromEntries(Object.entries(s.depth||{}).map(([position,ids])=>[position,ids.filter(playerId=>playerId!==id)]))};}
export function packPool(s,pack,players){return players.filter(p=>p.eligible&&!p.starter&&!s.unlocked.includes(p.id)&&p.overall>=pack.min&&p.overall<=pack.max)}
export function openPack(s,pack,players,random=Math.random){
 if(s.tokens<pack.cost)throw Error('Not enough scouting tokens.');const pool=packPool(s,pack,players);if(pool.length<pack.count)throw Error('Not enough undiscovered players remain in this pack.');
 const cards=[];for(let i=0;i<pack.count;i++)cards.push(pool.splice(Math.min(pool.length-1,Math.floor(random()*pool.length)),1)[0]);
 return {state:{...s,tokens:s.tokens-pack.cost,unlocked:[...s.unlocked,...cards.map(p=>p.id)]},cards};
}
export function autoFill(s,players,targets=REQUIREMENTS){let next=targets===ROSTER_TARGETS?autoFill(s,players,REQUIREMENTS):s;const picked=()=>next.roster.map(r=>players.find(p=>p.id===r.id));for(const [pos,min] of Object.entries(targets)){const need=Math.min(LIMIT-next.roster.length,Math.max(0,min-picked().filter(p=>p.position===pos).length));const choices=players.filter(p=>p.eligible&&p.position===pos&&(p.starter||s.unlocked.includes(p.id))&&!next.roster.some(r=>r.id===p.id)).sort((a,b)=>a.cost-b.cost||b.overall-a.overall);if(choices.length<need)throw Error(`Not enough available ${pos} players.`);for(let i=0;i<need;i++)next=recruit(next,choices[i]);}return next;}
