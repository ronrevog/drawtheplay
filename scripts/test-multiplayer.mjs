import webpush from 'web-push';
import {createECDH,randomBytes} from 'node:crypto';
const vapid=webpush.generateVAPIDKeys();
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Synthetic auth exists only in this in-memory test bundle, never in the deployed Worker.
const bundle=await build({stdin:{contents:`import {deliverPush} from './server/push.js';import {createHandler,routeRequest,MultiplayerRoom as BaseRoom} from './server/worker.js';const handler=createHandler(async r=>{const uid=r.headers.get('X-Test-User');if(!['alice','bob','eve'].includes(uid))throw Object.assign(new Error('Unauthorized'),{status:401});return {uid,phone:{alice:'+12025550101',bob:'+12025550102',eve:'+12025550103'}[uid]}});export class MultiplayerRoom extends BaseRoom {async fetch(r){if(new URL(r.url).pathname==='/api/multiplayer/test-push-delivery'){let n=0;await deliverPush(this.env,async(url,opts)=>{if(!opts.headers.Authorization||!opts.body.length)throw Error('Unencrypted push');n++;return new Response(null,{status:Number(new URL(r.url).searchParams.get('status')||201)})});return Response.json({sent:n})}return handler(r,this.env)}};export default {fetch:routeRequest}`,resolveDir:process.cwd(),sourcefile:'mp-test-entry.js'},bundle:true,write:false,format:'esm',platform:'node',banner:{js:"import {createRequire} from 'node:module';const require=createRequire('/worker.js');"},target:'es2022',external:['node:crypto','node:https','node:http','node:stream','node:util','node:url','node:buffer','crypto','https','http','stream','util','url','buffer']});
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'test',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-03',compatibilityFlags:['nodejs_compat'],d1Databases:['MP_DB'],durableObjects:{MP_ROOMS:{className:'MultiplayerRoom',useSQLite:true}},bindings:{MP_PHONE_KEY:'synthetic-local-test-key',PUSH_PUBLIC_KEY:vapid.publicKey,PUSH_PRIVATE_KEY:vapid.privateKey}}],logRequests:false}));
const catalog=JSON.parse(await readFile('public/data/catalog.json','utf8')).players;
function franchise(team){const eligible=catalog.filter(p=>p.eligible&&p.team===team);const starters=[...new Set(eligible.map(p=>p.position))].flatMap(pos=>eligible.filter(p=>p.position===pos).slice(0,3));const ids=[...new Set([...starters,...eligible].map(p=>p.id))].slice(0,53);return {name:team,identity:'pro-'+team.toLowerCase(),ids,depth:{}}}
let count=0;
try{
 const db=await mf.getD1Database('MP_DB');
 for(const sql of (await readFile('server/schema.sql','utf8')).split(';').filter(s=>s.trim()))await db.prepare(sql).run();
 async function call(user,path,data,status=200){if(data?.team&&!path.startsWith('nefl')){data={...data,franchise:franchise(data.team)};delete data.team}const r=await mf.dispatchFetch('https://example.com/api/multiplayer/'+path,{method:data?'POST':'GET',headers:{'X-Test-User':user,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const value=await r.json();assert.equal(r.status,status,JSON.stringify(value));return value}
 async function test(name,fn){await fn();count++;console.log('PASS',name)}
 await test('anonymous requests rejected',()=>call('nobody','matches',undefined,401));
 await test('account saves are private, survive reload, and reject stale device writes',async()=>{
  const state={welcomeGrant20261010:true,version:1,name:'Phone franchise',roster:[],history:[],plays:[],unlocked:[],milestones:[],credits:100000,tokens:5};
  assert.equal(await call('alice','franchise'),null);
  await call('alice','franchise',{revision:0,state});
  assert.equal(await call('bob','franchise'),null);
  const pc=await call('alice','franchise');assert.equal(pc.state.name,'Phone franchise');assert.equal(pc.revision,1);
  const next={...state,name:'Updated on PC',tokens:7};
  await call('alice','franchise',{revision:1,state:next});
  await call('alice','franchise',{revision:1,state},409);
  assert.equal((await call('alice','franchise')).state.tokens,7);
  await call('bob','franchise',{revision:0,state:{...state,name:'Bob'}});
  assert.equal((await call('alice','franchise')).state.name,'Updated on PC');
  await call('alice','franchise',{revision:2,state:{...state,roster:[{id:'x',paid:-1}]}},400);
 });
 await test('account gift migration is one-time and rejects stale pre-gift saves',async()=>{
  const old={version:1,budgetVersion:2,name:'Gift fixture',credits:27,tokens:3,roster:[],history:[],plays:[],unlocked:[],milestones:[],unlimitedTokens:true};
  await db.prepare('INSERT INTO pc_franchises(uid,revision,doc,updated) VALUES (?,1,?,0)').bind('eve',JSON.stringify(old)).run();
  const sql=await readFile('server/welcome-grant.sql','utf8');await db.prepare(sql).run();await db.prepare(sql).run();
  const saved=await call('eve','franchise');assert.equal(saved.revision,2);assert.equal(saved.state.credits,200027);assert.equal(saved.state.tokens,103);assert.equal(saved.state.unlimitedTokens,false);
  await call('eve','franchise',{revision:2,state:old},409);
  await call('eve','franchise',{revision:2,state:{...saved.state,tokens:102}});
  assert.equal((await call('eve','franchise')).state.tokens,102);
 });
 await test('solo league needs no coach profile and CPU answers immediately',async()=>{
  assert.equal(await call('eve','profile'),null);
  const league=await call('eve','nefl',{name:'CPU fixture',mode:'solo',team:'wildcats',franchise:franchise('KC')});
  const fixture=league.games.find(g=>g.week===1&&(g.home==='wildcats'||g.away==='wildcats'));
  const m=await call('eve',`nefl/${league.id}/play`,{fixture:fixture.id});assert.ok(m.cpu);assert.notEqual(m.cpu,m.side);
  const next=await call('eve',`matches/${m.id}/call`,{revision:m.revision,turn:m.game.state.turn,...(m.side===m.game.state.possession?{action:'snap'}:{coverage:'Cover 2'})});
  assert.equal(next.game.state.turn,m.game.state.turn+1);assert.equal(next.submitted,false);assert.equal(next.opponentSubmitted,false);
  const replay=await call('eve',`matches/${m.id}/replay`);assert.ok(replay.event.simulation.frames.length);
  const own=next.side;const timed=await call('eve',`matches/${m.id}/timeout`,{revision:next.revision});assert.equal(timed.game.state.timeouts[own],next.game.state.timeouts[own]-1);assert.equal(timed.game.state.timeouts[m.cpu],next.game.state.timeouts[m.cpu]);
  await call('alice',`matches/${m.id}/timeout`,{revision:timed.revision},404);

 });
 await test('private profiles, public opt-in directory',async()=>{
  for(const uid of ['alice','bob','eve'])await call(uid,'profile',{handle:uid,name:uid,discoverable:uid!=='eve'});
  assert.deepEqual(await call('alice','players?q=eve'),[]);
  const results=await call('alice','players?q=bob');assert.equal(results[0].uid,'bob');assert.equal(results[0].phone_hash,undefined);
  await call('eve','profile',{handle:'bob',name:'Eve',discoverable:true},409);
 });
 await test('coach profiles protect hidden users and expose only safe stats',async()=>{
  await call('alice','players/eve',undefined,404);
  const p=await call('alice','players/bob');assert.deepEqual(Object.keys(p).sort(),['handle','name','stats','uid']);assert.equal(p.stats.games,0);assert.equal(p.stats.wins,0);
  assert.equal((await call('eve','players/eve')).uid,'eve');
 });
 let id,m;
 await test('franchise required; unknown and duplicate players rejected',async()=>{
  await call('alice','matches',{target:'bob'},400);
  const f=franchise('KC');
  await call('alice','matches',{target:'bob',franchise:{...f,ids:[...f.ids,'invented']}},400);
  await call('alice','matches',{target:'bob',franchise:{...f,ids:[f.ids[0],f.ids[0]]}},400);
 });
 await test('phone invitation visible only to invited verified number',async()=>{
  ({id}=await call('alice','matches',{phone:'2025550102',team:'KC'},201));
  assert.equal((await call('bob','matches'))[0].id,id);
  assert.ok(!(await call('eve','matches')).some(m=>m.id===id));
  await call('eve',`matches/${id}`,undefined,404);
  await call('eve',`matches/${id}/accept`,{revision:0,team:'BUF'},404);
 });
 await test('notifications explain invitations and read state persists per account',async()=>{
  const list=await call('bob','notifications'),notice=list.find(n=>n.matchId===id);assert.ok(notice.title.includes('alice'));assert.equal(notice.read,false);
  await call('bob','notifications',{read:[notice.id]});assert.equal((await call('bob','notifications')).find(n=>n.id===notice.id).read,true);
  assert.ok(!(await call('eve','notifications')).some(n=>n.matchId===id));
  await call('bob','notifications',{read:['bad']},400);
 });
 await test('recipient accepts once; server owns rosters and randomness',async()=>{
  m=await call('bob',`matches/${id}/accept`,{revision:0,team:'BUF'});
  assert.deepEqual(m.game.home.map(p=>p.id).sort(),franchise('KC').ids.sort());assert.deepEqual(m.game.away.map(p=>p.id).sort(),franchise('BUF').ids.sort());assert.equal(m.hostFranchise.identity,'pro-kc');assert.equal(m.guestFranchise.identity,'pro-buf');assert.equal(m.status,'active');assert.equal(m.game.seed,undefined);assert.equal(m.game.id,id);
  await call('bob',`matches/${id}/accept`,{revision:0,team:'BUF'},409);
 });
 await test('simultaneous calls resolve exactly once after stale caller refresh',async()=>{
  const revision=m.revision,turn=m.game.state.turn;
  const requests=[['alice',{coverage:'Man'}],['bob',{action:'snap'}]];
  const results=await Promise.all(requests.map(async([uid,data])=>{const r=await mf.dispatchFetch(`https://example.com/api/multiplayer/matches/${id}/call`,{method:'POST',headers:{'X-Test-User':uid,'Content-Type':'application/json'},body:JSON.stringify({revision,turn,...data})});return {uid,data,status:r.status,body:await r.json()}}));
  assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===409).length,1);
  const saved=results.find(r=>r.status===200).body;assert.equal(saved.submitted,true);assert.equal(saved.game.state.turn,turn);
  const loser=results.find(r=>r.status===409);const pending=await call(loser.uid,`matches/${id}`);
  assert.equal(pending.calls,undefined);assert.equal(JSON.stringify(pending).includes('phone_hash'),false);
  m=await call(loser.uid,`matches/${id}/call`,{revision:pending.revision,turn,...loser.data});
  assert.equal(m.game.state.turn,turn+1);assert.equal(m.submitted,false);
  await call(loser.uid,`matches/${id}/call`,{revision:pending.revision,turn,...loser.data},409);
 });
 await test('new turn generates a fresh notification without restoring read alerts',async()=>{
  const n=(await call('bob','notifications')).find(n=>n.matchId===id);assert.ok(n);assert.equal(n.read,false);assert.ok(n.body.includes('Choose your play'));
  await call('bob','notifications',{read:[n.id]});assert.equal((await call('bob','notifications')).find(x=>x.id===n.id).read,true);
  const alice=(await call('alice','notifications')).find(x=>x.matchId===id);assert.equal(alice.read,false);
 });
 await test('replay authorized and seed stays private',async()=>{
  const r=await call('alice',`matches/${id}/replay`);assert.ok(r.event.simulation.frames.length);assert.equal(r.before.seed,undefined);assert.equal(r.before.id,id);
  await call('eve',`matches/${id}/replay`,undefined,404);
 });
 await test('malformed calls and stale turns cannot change game',async()=>{
  const a=await call('alice',`matches/${id}`),off=a.game.state.possession==='home'?'alice':'bob';
  await call(off,`matches/${id}/call`,{revision:a.revision,turn:a.game.state.turn,play:{id:'bad'}},400);
  assert.equal((await call('alice',`matches/${id}`)).revision,a.revision);
 });
 await test('registered invitations can be declined and expired',async()=>{
  const r=await call('alice','matches',{target:'bob',team:'KC'},201);
  await call('bob',`matches/${r.id}/decline`,{revision:0});
  await call('bob',`matches/${r.id}/accept`,{revision:1,team:'BUF'},409);
  const e=await call('alice','matches',{target:'bob',team:'KC'},201);
  await db.prepare('UPDATE mp_matches SET expires=0 WHERE id=?').bind(e.id).run();
  await call('bob',`matches/${e.id}/accept`,{revision:0,team:'BUF'},409);
 });
 await test('forfeit stops further calls',async()=>{
  const a=await call('alice',`matches/${id}`);m=await call('alice',`matches/${id}/forfeit`,{revision:a.revision});assert.equal(m.winner,'away');
  await call('bob',`matches/${id}/call`,{revision:m.revision,turn:m.game.state.turn,coverage:'Man'},409);
 });
 await test('request body bounded before parsing',async()=>{
  const r=await mf.dispatchFetch('https://example.com/api/multiplayer/profile',{method:'POST',headers:{'X-Test-User':'alice','Content-Type':'application/json'},body:JSON.stringify({name:'x'.repeat(40000)})});assert.equal(r.status,413);
 });
 await test('profile record counts forfeits without adding unfinished points',async()=>{
  const a=await call('bob','players/alice'),b=await call('alice','players/bob');
  assert.equal(a.stats.losses,1);assert.equal(b.stats.wins,1);assert.equal(a.stats.games,1);assert.equal(a.stats.pointsFor,0);
 });
 await test('both coaches can complete a saved match with calls on either side',async()=>{
  const r=await call('alice','matches',{target:'bob',team:'KC'},201);
  let live=await call('bob',`matches/${r.id}/accept`,{revision:0,team:'BUF'}),turns=0;
  const started=performance.now();
  while(live.status==='active'&&turns<150){
   const turn=live.game.state.turn,off=live.game.state.possession==='home'?'alice':'bob',def=off==='alice'?'bob':'alice';
   live=await call(def,`matches/${r.id}/call`,{revision:live.revision,turn,coverage:'Cover 2'});
   live=await call(off,`matches/${r.id}/call`,{revision:live.revision,turn,action:'snap'});turns++;
  }
  assert.equal(live.status,'complete');assert.ok(turns>5);
  const stored=await db.prepare('SELECT length(doc) AS bytes FROM mp_matches WHERE id=?').bind(r.id).first();
  assert.ok(stored.bytes<1900000);console.log('Completed',turns,'plays in',Math.round(performance.now()-started),'ms; saved match bytes:',stored.bytes);
 });

 await db.prepare('DELETE FROM mp_limits').run();
 await test('NEFL private lobby, team claims and commissioner access',async()=>{
  let l=await call('alice','nefl',{mode:'online',name:'Test league',team:'wildcats',franchise:franchise('KC')});
  assert.equal(l.games.length,100);assert.equal(l.rosters,undefined);
  await call('eve',`nefl/${l.id}`,undefined,404);
  await call('bob',`nefl/${l.id}/join`,{team:'wildcats',franchise:franchise('BUF')},409);
  l=await call('bob',`nefl/${l.id}/join`,{team:'sentinels',franchise:franchise('BUF')});
  await call('bob',`nefl/${l.id}/start`,{revision:l.revision},403);
  l=await call('alice',`nefl/${l.id}/start`,{revision:l.revision});
  await call('eve',`nefl/${l.id}/join`,{team:'sabers',franchise:franchise('BUF')},409);
  await call('alice',`nefl/${l.id}/advance`,{revision:l.revision},409);
  assert.equal((await call('bob','nefl')).length,1);
  const fixture=l.games.find(g=>g.week===1&&[g.home,g.away].includes('wildcats'));
  let gm=await call('alice',`nefl/${l.id}/play`,{fixture:fixture.id});const turn=gm.game.state.turn;
  gm=await call('alice',`matches/${gm.id}/call`,{revision:gm.revision,turn,...(gm.side===gm.game.state.possession?{action:'snap'}:{coverage:'Man'})});assert.equal(gm.game.state.turn,turn);assert.equal(gm.submitted,true);
  gm=await call('bob',`matches/${gm.id}`);
  gm=await call('bob',`matches/${gm.id}/call`,{revision:gm.revision,turn,...(gm.side===gm.game.state.possession?{action:'snap'}:{coverage:'Man'})});assert.equal(gm.game.state.turn,turn+1);

 });
 await test('NEFL solo CPU calls, idempotent resume and complete season bracket',async()=>{
  let l=await call('alice','nefl',{mode:'solo',name:'Solo test',team:'wildcats',franchise:franchise('KC')});
  const fixture=l.games.find(g=>g.week===1&&[g.home,g.away].includes('wildcats'));
  let m=await call('alice',`nefl/${l.id}/play`,{fixture:fixture.id});
  const turn=m.game.state.turn;
  m=await call('alice',`matches/${m.id}/call`,{revision:m.revision,turn,...(m.side===m.game.state.possession?{action:'snap'}:{coverage:'Man'})});
  assert.equal(m.game.state.turn,turn+1);assert.equal(m.submitted,false);
  const resumed=await call('alice',`nefl/${l.id}/play`,{fixture:fixture.id});assert.equal(resumed.revision,m.revision);
  await call('eve',`matches/${m.id}`,undefined,404);
  let snaps=0;
  while(m.status==='active'&&snaps++<150){m=await call('alice',`matches/${m.id}/call`,{revision:m.revision,turn:m.game.state.turn,...(m.side===m.game.state.possession?{action:'snap'}:{coverage:'Cover 2'})})}
  assert.equal(m.status,'complete');assert.ok(snaps>5);
  await db.prepare('DELETE FROM mp_limits').run();
  for(let w=1;w<=13;w++){
   for(const f of l.games.filter(g=>g.week===w&&[g.home,g.away].includes('wildcats'))){
    const gm=await call('alice',`nefl/${l.id}/play`,{fixture:f.id});
    if(gm.status==='active')await call('alice',`matches/${gm.id}/forfeit`,{revision:gm.revision});
   }
   l=await call('alice',`nefl/${l.id}/advance`,{revision:l.revision});
  }
  assert.equal(l.status,'complete');assert.ok(l.champion);assert.equal(l.games.length,107);assert.equal(l.games.filter(g=>g.score).length,107);
 });

 await db.prepare('DELETE FROM mp_limits').run();
 await test('push subscriptions are owner scoped; encrypted delivery respects preferences',async()=>{
  const ec=createECDH('prime256v1');ec.generateKeys();const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-device',keys:{p256dh:ec.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
  await call('alice','push',{action:'enable',subscription:{...subscription,endpoint:'https://127.0.0.1/private'}},400);
  await call('alice','push',{action:'enable',subscription,preferences:{turns:false}});
  assert.equal((await call('alice','push',{action:'status',subscription})).enabled,true);
  assert.equal((await call('bob','push',{action:'status',subscription})).enabled,false);
  await call('bob','push',{action:'disable',subscription});assert.equal((await call('alice','push',{action:'status',subscription})).enabled,true);
  await db.prepare('DELETE FROM pc_push_outbox').run();
  for(const type of ['turns','invites'])await db.prepare('INSERT INTO pc_push_outbox VALUES (?,?,?,?,?,?,0)').bind(type,'alice',type,JSON.stringify({title:'Synthetic test',url:'/'}),Date.now(),0).run();
  const result=await call('alice','test-push-delivery');assert.equal(result.sent,1);
  assert.equal((await db.prepare('SELECT count(*) n FROM pc_push_outbox').first()).n,0);
  await db.prepare('INSERT INTO pc_push_outbox VALUES (?,?,?,?,?,?,0)').bind('retry','alice','invites',JSON.stringify({title:'Retry',url:'/'}),Date.now(),0).run();
  await call('alice','test-push-delivery?status=503');assert.equal((await db.prepare("SELECT attempts FROM pc_push_outbox WHERE id='retry'").first()).attempts,1);
  await db.prepare("UPDATE pc_push_outbox SET next_try=0 WHERE id='retry'").run();
  await call('alice','test-push-delivery?status=410');assert.equal((await call('alice','push',{action:'status',subscription})).enabled,false);
  await call('alice','push',{action:'enable',subscription});
  await call('alice','push',{action:'disable',subscription});assert.equal((await call('alice','push',{action:'status',subscription})).enabled,false);
 });
 console.log(`${count} native Worker/D1 multiplayer checks passed.`);
}finally{await mf.dispose()}
