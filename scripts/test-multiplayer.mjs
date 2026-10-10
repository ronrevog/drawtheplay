import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Synthetic auth exists only in this in-memory test bundle, never in the deployed Worker.
const bundle=await build({stdin:{contents:`import {createHandler,routeRequest,MultiplayerRoom as BaseRoom} from './server/worker.js';const handler=createHandler(async r=>{const uid=r.headers.get('X-Test-User');if(!['alice','bob','eve'].includes(uid))throw Object.assign(new Error('Unauthorized'),{status:401});return {uid,phone:{alice:'+12025550101',bob:'+12025550102',eve:'+12025550103'}[uid]}});export class MultiplayerRoom extends BaseRoom {fetch(r){return handler(r,this.env)}};export default {fetch:routeRequest}`,resolveDir:process.cwd(),sourcefile:'mp-test-entry.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'test',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-03',d1Databases:['MP_DB'],durableObjects:{MP_ROOMS:{className:'MultiplayerRoom',useSQLite:true}},bindings:{MP_PHONE_KEY:'synthetic-local-test-key'}}],logRequests:false}));
const catalog=JSON.parse(await readFile('public/data/catalog.json','utf8')).players;
function franchise(team){const eligible=catalog.filter(p=>p.eligible&&p.team===team);const starters=[...new Set(eligible.map(p=>p.position))].flatMap(pos=>eligible.filter(p=>p.position===pos).slice(0,3));const ids=[...new Set([...starters,...eligible].map(p=>p.id))].slice(0,53);return {name:team,identity:'pro-'+team.toLowerCase(),ids,depth:{}}}
let count=0;
try{
 const db=await mf.getD1Database('MP_DB');
 for(const sql of (await readFile('server/schema.sql','utf8')).split(';').filter(s=>s.trim()))await db.prepare(sql).run();
 async function call(user,path,data,status=200){if(data?.team){data={...data,franchise:franchise(data.team)};delete data.team}const r=await mf.dispatchFetch('https://example.com/api/multiplayer/'+path,{method:data?'POST':'GET',headers:{'X-Test-User':user,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const value=await r.json();assert.equal(r.status,status,JSON.stringify(value));return value}
 async function test(name,fn){await fn();count++;console.log('PASS',name)}
 await test('anonymous requests rejected',()=>call('nobody','matches',undefined,401));
 await test('private profiles, public opt-in directory',async()=>{
  for(const uid of ['alice','bob','eve'])await call(uid,'profile',{handle:uid,name:uid,discoverable:uid!=='eve'});
  assert.deepEqual(await call('alice','players?q=eve'),[]);
  const results=await call('alice','players?q=bob');assert.equal(results[0].uid,'bob');assert.equal(results[0].phone_hash,undefined);
  await call('eve','profile',{handle:'bob',name:'Eve',discoverable:true},409);
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
  assert.equal((await call('eve','matches')).length,0);
  await call('eve',`matches/${id}`,undefined,404);
  await call('eve',`matches/${id}/accept`,{revision:0,team:'BUF'},404);
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
 console.log(`${count} native Worker/D1 multiplayer checks passed.`);
}finally{await mf.dispose()}
