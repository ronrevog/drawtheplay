import webpush from 'web-push';
import {fail} from './match.js';
export function validSubscription(s){
 if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2048)return false;
 try{const u=new URL(s.endpoint);if(u.protocol!=='https:'||u.username||u.password||u.port||!['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com'].includes(u.hostname))return false}catch{return false}
 return /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh||'')&&/^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth||'');
}
export async function subscriptionId(endpoint){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function pushSettings(db,env,user,data){
 if(!data)return {configured:!!(env.PUSH_PUBLIC_KEY&&env.PUSH_PRIVATE_KEY),publicKey:env.PUSH_PUBLIC_KEY||null};
 if(!validSubscription(data.subscription))fail('Invalid notification subscription.');const id=await subscriptionId(data.subscription.endpoint);
 if(data.action==='disable'){await db.prepare('DELETE FROM pc_push WHERE id=? AND uid=?').bind(id,user.uid).run();return {enabled:false}}
 if(data.action==='status'){const row=await db.prepare('SELECT preferences FROM pc_push WHERE id=? AND uid=?').bind(id,user.uid).first();return {enabled:!!row,preferences:row?JSON.parse(row.preferences):null}}
 if(data.action!=='enable')fail('Invalid notification action.');if(!env.PUSH_PRIVATE_KEY)fail('Notifications are being configured.',503);
 const preferences=Object.fromEntries(['invites','turns','results','league'].map(k=>[k,data.preferences?.[k]!==false]));
 await db.prepare('INSERT INTO pc_push(id,uid,subscription,preferences,updated) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET uid=excluded.uid,subscription=excluded.subscription,preferences=excluded.preferences,updated=excluded.updated').bind(id,user.uid,JSON.stringify(data.subscription),JSON.stringify(preferences),Date.now()).run();
 await db.prepare('DELETE FROM pc_push WHERE uid=? AND id NOT IN (SELECT id FROM pc_push WHERE uid=? ORDER BY updated DESC LIMIT 10)').bind(user.uid,user.uid).run();return {enabled:true,preferences};
}
export async function enqueuePush(db,{id,uid,type,title,body,url}){
 if(!uid||uid.startsWith('cpu:'))return;
 await db.prepare('INSERT OR IGNORE INTO pc_push_outbox(id,uid,type,payload,created,next_try,attempts) VALUES (?,?,?,?,?,?,0)').bind(id,uid,type,JSON.stringify({title,body,url,tag:id}),Date.now(),Date.now()).run();
}
export async function deliverPush(env,send=fetch){
 if(!env.PUSH_PRIVATE_KEY)return;
 const db=env.MP_DB,now=Date.now();
 await db.prepare('DELETE FROM pc_push_outbox WHERE created<?').bind(now-86400000).run();
 const jobs=(await db.prepare('SELECT * FROM pc_push_outbox WHERE next_try<=? AND attempts<5 ORDER BY created LIMIT 5').bind(now).all()).results;
 for(const job of jobs){
  const claimed=await db.prepare('UPDATE pc_push_outbox SET next_try=?,attempts=attempts+1 WHERE id=? AND next_try=?').bind(Date.now()+120000,job.id,job.next_try).run();if(claimed.meta.changes!==1)continue;
  const devices=(await db.prepare('SELECT * FROM pc_push WHERE uid=?').bind(job.uid).all()).results;let retry=false;
  for(const device of devices){if(!JSON.parse(device.preferences)[job.type])continue;
   try{const req=webpush.generateRequestDetails(JSON.parse(device.subscription),job.payload,{TTL:3600,vapidDetails:{subject:'https://playcallfootball.com',publicKey:env.PUSH_PUBLIC_KEY,privateKey:env.PUSH_PRIVATE_KEY}});const r=await send(req.endpoint,{method:'POST',headers:req.headers,body:req.body,signal:AbortSignal.timeout(7000)});if(r.status===404||r.status===410)await db.prepare('DELETE FROM pc_push WHERE id=?').bind(device.id).run();else if(!r.ok)retry=true;}catch{retry=true}
  }
  if(!retry)await db.prepare('DELETE FROM pc_push_outbox WHERE id=?').bind(job.id).run();
 }
}
