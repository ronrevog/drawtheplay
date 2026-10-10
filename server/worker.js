import {createRemoteJWKSet,jwtVerify} from 'jose';
import catalog from '../public/data/catalog.json';
import {normalizePhone} from '../src/phoneAuth.js';
import {simulateSnap} from '../src/practice.js';
import {fail,teamRoster,franchiseSnapshot,newGame,sanitizeCall,resolveCalls,visibleMatch} from './match.js';

const project='draw-the-play-football';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
export async function authenticate(request){
 const token=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];if(!token)fail('Sign in to play with friends.',401);
 try{
  const {payload}=await jwtVerify(token,keys,{issuer:`https://securetoken.google.com/${project}`,audience:project,algorithms:['RS256']});
  if(!payload.sub||payload.sub.length>128||!Number.isFinite(payload.exp)||!Number.isFinite(payload.auth_time)||payload.auth_time>Date.now()/1000+30||!Number.isFinite(payload.iat)||payload.iat>Date.now()/1000+30||!/^\+1\d{10}$/.test(payload.phone_number||''))throw Error();
  return {uid:payload.sub,phone:payload.phone_number};
 }catch{fail('Your sign-in expired. Please sign in again.',401)}
}
async function digest(value,secret){
 if(!secret)fail('Multiplayer is being configured.',503);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
async function body(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail('JSON required.',415);
 const reader=request.body?.getReader();if(!reader)fail('Request body required.');let chunks=[],size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();fail('Request too large.',413)}chunks.push(value)}
 try{const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length}const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||Array.isArray(data)||typeof data!=='object')throw Error();return data}catch{fail('Invalid JSON.')}
}
async function limit(db,uid,kind,max,seconds){
 const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/seconds),id=`${uid}:${kind}:${bucket}`;
 const row=await db.prepare('INSERT INTO mp_limits(id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,now+seconds).first();
 if(row.count===1)await db.prepare('DELETE FROM mp_limits WHERE id IN (SELECT id FROM mp_limits WHERE expires<? LIMIT 500)').bind(now).run();
 if(row.count>max)fail('Too many requests. Please try again later.',429);
}
export function createHandler(authenticateRequest=authenticate){return async function(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/multiplayer/'))return env.ASSETS.fetch(request);
 try{
  if(!['GET','POST'].includes(request.method))fail('Method not allowed.',405);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)fail('Origin not allowed.',403);
  const user=await authenticateRequest(request),db=env.MP_DB;
  const phoneHash=await digest(user.phone,env.MP_PHONE_KEY);
  await limit(db,user.uid,'requests',120,60);
  const path=url.pathname.slice('/api/multiplayer/'.length),data=request.method==='POST'?await body(request):null;
  if(path==='profile'){
   if(data){
    if(typeof data.handle!=='string'||!(/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/).test(data.handle))fail('Use a username of 3–20 letters, numbers or underscores. Start with a letter.');
    if(typeof data.name!=='string'||data.name.trim().length<2||data.name.trim().length>32)fail('Use a player name of 2–32 characters.');
    await limit(db,user.uid,'profile',10,3600);
    try{await db.prepare('INSERT INTO mp_players(uid,handle,name,phone_hash,discoverable,updated) VALUES (?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET handle=excluded.handle,name=excluded.name,phone_hash=excluded.phone_hash,discoverable=excluded.discoverable,updated=excluded.updated').bind(user.uid,data.handle.toLowerCase(),data.name.trim(),phoneHash,data.discoverable===true?1:0,Date.now()).run()}catch(e){if(String(e).includes('UNIQUE'))fail('That username is taken.',409);throw e}
   }
   return json(await db.prepare('SELECT uid,handle,name,discoverable FROM mp_players WHERE uid=?').bind(user.uid).first());
  }
  if(path==='players'&&!data){
   const query=url.searchParams.get('q')?.trim().toLowerCase()||'';
   if(!/^[a-z][a-z0-9_]{2,19}$/.test(query))return json([]);
   return json((await db.prepare('SELECT uid,handle,name FROM mp_players WHERE discoverable=1 AND uid<>? AND substr(handle,1,?)=? ORDER BY handle LIMIT 15').bind(user.uid,query.length,query).all()).results);
  }
  if(path==='matches'&&!data){
   const rows=(await db.prepare(`SELECT id,host,guest,status,revision,expires,updated,json_object('hostName',json_extract(doc,'$.hostName'),'guestName',json_extract(doc,'$.guestName'),'hostTeam',json_extract(doc,'$.hostTeam'),'guestTeam',json_extract(doc,'$.guestTeam'),'winner',json_extract(doc,'$.winner'),'hostFranchise',json_object('identity',json_extract(doc,'$.hostFranchise.identity'),'primary',json_extract(doc,'$.hostFranchise.primary'),'secondary',json_extract(doc,'$.hostFranchise.secondary')),'guestFranchise',json_object('identity',json_extract(doc,'$.guestFranchise.identity'),'primary',json_extract(doc,'$.guestFranchise.primary'),'secondary',json_extract(doc,'$.guestFranchise.secondary')),'calls',json_object('home',json_type(doc,'$.calls.home') IS NOT NULL,'away',json_type(doc,'$.calls.away') IS NOT NULL),'game',CASE WHEN json_type(doc,'$.game.state') IS NOT NULL THEN json_object('state',json_extract(doc,'$.game.state'),'completed',json_extract(doc,'$.game.completed')) ELSE NULL END) AS doc FROM mp_matches WHERE host=? OR guest=? OR (status='invited' AND expires>? AND (target_uid=? OR target_hash=?)) ORDER BY updated DESC LIMIT 60`).bind(user.uid,user.uid,Date.now(),user.uid,phoneHash).all()).results;
   return json(rows.map(r=>{const m=visibleMatch(r,user.uid);return {...m,game:m.game?{state:m.game.state,completed:m.game.completed}:null,status:r.status==='invited'&&r.expires<Date.now()?'expired':r.status}}));
  }
  const profile=await db.prepare('SELECT uid,handle,name FROM mp_players WHERE uid=?').bind(user.uid).first();
  if(!profile)fail('Create your multiplayer player name first.',409);
  if(path==='matches'&&data){
   await limit(db,user.uid,'invites',10,86400);const franchise=franchiseSnapshot(catalog.players,data.franchise);
   const active=await db.prepare("SELECT count(*) AS n FROM mp_matches WHERE host=? AND (status='active' OR (status='invited' AND expires>?))").bind(user.uid,Date.now()).first();if(active.n>=10)fail('Finish or cancel an existing challenge first.',409);
   let target=null,targetHash=null;
   if(data.phone){let phone;try{phone=normalizePhone(data.phone)}catch(e){fail(e.message)}if(phone===user.phone)fail('Invite another player.');targetHash=await digest(phone,env.MP_PHONE_KEY)}
   else{target=await db.prepare('SELECT uid FROM mp_players WHERE uid=? AND discoverable=1').bind(typeof data.target==='string'?data.target:'').first();if(!target||target.uid===user.uid)fail('Choose another registered player.')}
   const id=crypto.randomUUID(),now=Date.now(),expires=now+7*86400000;
   const doc={hostName:profile.name,hostTeam:franchise.name,hostFranchise:franchise,calls:{},game:null};
   await db.prepare('INSERT INTO mp_matches(id,host,target_uid,target_hash,status,revision,doc,created,updated,expires) VALUES (?,?,?,?,\'invited\',0,?,?,?,?)').bind(id,user.uid,target?.uid||null,targetHash,JSON.stringify(doc),now,now,expires).run();
   return json({id,url:`https://playcallfootball.com/?invite=${id}`},201);
  }
  const match=path.match(/^matches\/([a-f0-9-]{36})(?:\/(accept|decline|cancel|forfeit|call|replay))?$/);if(!match)fail('Not found.',404);
  const [,id,action]=match,row=await db.prepare('SELECT * FROM mp_matches WHERE id=?').bind(id).first();
  const member=row&&(row.host===user.uid||row.guest===user.uid),recipient=row&&(row.target_uid===user.uid||row.target_hash===phoneHash);
  if(!row||(!member&&!recipient))fail('This challenge is not available to this account.',404);
  if(!action&&!data)return json({...visibleMatch(row,user.uid),status:row.status==='invited'&&row.expires<Date.now()?'expired':row.status});
  if(action==='replay'&&!data){if(!member)fail('Not found.',404);const d=JSON.parse(row.doc);if(!d.replay)return json(null);await limit(db,user.uid,'replay',20,60);const next=simulateSnap(d.replay.before,d.replay.call);return json({before:{...d.replay.before,id:row.id,seed:undefined},play:d.replay.call.play,event:next.last})}
  if(!data)fail('Use POST.',405);
  if(data.revision!==row.revision)fail('This match changed. Refresh and try again.',409);
  const doc=JSON.parse(row.doc);let status=row.status,guest=row.guest;
  if(action==='accept'){
   if(!recipient||row.host===user.uid||status!=='invited'||row.expires<Date.now())fail('This invitation is no longer available.',409);
   const franchise=franchiseSnapshot(catalog.players,data.franchise);guest=user.uid;status='active';doc.guestName=profile.name;doc.guestTeam=franchise.name;doc.guestFranchise=franchise;
   doc.game=newGame(catalog.players,doc.hostFranchise||doc.hostTeam,doc.guestFranchise,crypto.randomUUID());doc.calls={};
  }else if(action==='decline'||action==='cancel'){
   if(status!=='invited'||(action==='decline'?!recipient:row.host!==user.uid))fail('Cannot change this invitation.',409);status=action==='decline'?'declined':'cancelled';
  }else if(action==='forfeit'){
   if(!member||status!=='active')fail('Cannot forfeit this match.',409);status='forfeited';doc.winner=row.host===user.uid?'away':'home';doc.calls={};
  }else if(action==='call'){
   if(!member||status!=='active')fail('This match is not active.',409);
   const side=row.host===user.uid?'home':'away';if(data.turn!==doc.game.state.turn||doc.calls[side])fail('Your call is already locked or this play changed.',409);
   doc.calls[side]=sanitizeCall(data,doc.game,side);
   if(doc.calls.home&&doc.calls.away){resolveCalls(doc);if(doc.game.completed)status='complete'}
  }else fail('Not found.',404);
  const saved=await db.prepare('UPDATE mp_matches SET guest=?,status=?,doc=?,revision=revision+1,updated=? WHERE id=? AND revision=?').bind(guest,status,JSON.stringify(doc),Date.now(),id,row.revision).run();
  if(saved.meta.changes!==1)fail('The other player just updated this match. Refresh and try again.',409);
  return json(visibleMatch({...row,guest,status,doc:JSON.stringify(doc),revision:row.revision+1,updated:Date.now()},user.uid));
 }catch(e){return json({error:e.status?e.message:'Multiplayer is temporarily unavailable. Please try again.'},e.status||500)}
}}
// Each match gets independent execution capacity; all identity checks remain inside
// the handler. Directory traffic shares a coordinator, with D1 enforcing limits.
export class MultiplayerRoom {
 constructor(state,env){this.env=env;this.handle=createHandler()}
 fetch(request){return this.handle(request,this.env)}
}
export function routeRequest(request,env){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/multiplayer/'))return env.ASSETS.fetch(request);
 const match=path.match(/^\/api\/multiplayer\/matches\/([a-f0-9-]{36})(?:\/|$)/);
 const id=env.MP_ROOMS.idFromName(match?`match:${match[1]}`:'directory');
 return env.MP_ROOMS.get(id).fetch(request);
}
export default {fetch:routeRequest};
