import {useEffect,useRef,useState} from 'react';
import {auth} from './firebase';
import {multiplayerApi as api} from './multiplayerApi';
import {restore} from './economy';
import {saveText,hasProgress,reconcileSave} from './franchiseSync';
const LEGACY='dtp-web-franchise-v1';
export function useFranchiseSync(data,state,setState){
 const [status,setStatus]=useState('Loading account save…'),[conflict,setConflict]=useState(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const latest=useRef(state);latest.current=state;
 const session=useRef(null);
 useEffect(()=>{
  if(!data||!auth.currentUser)return;
  const uid=auth.currentUser.uid,key=`playcall-save:${uid}`,s={key,uid,base:null,revision:0,alive:true,busy:false,blocked:false};session.current=s;
  const parse=raw=>restore(raw,data.players);
  function cache(value){try{localStorage.setItem(key,JSON.stringify({state:saveText(value),base:s.base,revision:s.revision}))}catch{setError('Local backup unavailable. Keep this page open until cloud saving succeeds.')}}
  s.cache=cache;
  function backup(value){try{const key=s.key+':backups',old=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([{at:Date.now(),state:saveText(value)},...old].slice(0,3)))}catch{/* Cloud previous_doc also retains the prior committed save. */}}
  s.backup=backup;
  function useCloud(cloud){s.revision=cloud.revision;s.base=saveText(parse(JSON.stringify(cloud.state)));const next=parse(s.base);latest.current=next;setState(next);cache(next);setStatus('Saved to your account');}
  s.useCloud=useCloud;
  async function load(){try{
   let stored=null,legacy=null;try{stored=JSON.parse(localStorage.getItem(key)||'null');const owner=localStorage.getItem(LEGACY+':owner');if(!owner||owner===uid){legacy=localStorage.getItem(LEGACY);if(legacy)localStorage.setItem(LEGACY+':owner',uid)}}catch{}
   const local=parse(stored?.state||legacy);s.base=stored?.base?saveText(parse(stored.base)):null;s.revision=stored?.revision||0;
   const cloud=await api('franchise');if(!s.alive)return;
   const cloudText=cloud?saveText(parse(JSON.stringify(cloud.state))):null;
   const choice=!hasProgress(local)&&!s.base&&cloud?'cloud':reconcileSave(saveText(local),s.base,cloudText);
   if(choice==='cloud')useCloud(cloud);
   else{latest.current=local;setState(local);if(choice==='conflict'){s.blocked=true;setConflict({local,cloud});setStatus('Choose which franchise to keep')}else{s.revision=cloud?.revision||0;setStatus('Waiting to save…')}cache(local)}
   setReady(true);setError('');
  }catch(e){if(s.alive){setError(e.message);setStatus('Could not load account save')}}}
  s.flush=async()=>{
   if(!s.alive||s.busy||s.blocked||!latest.current)return;
   const value=latest.current,text=saveText(value);if(text===s.base)return;
   s.busy=true;setStatus('Saving to your account…');
   try{const result=await api('franchise',{revision:s.revision,state:JSON.parse(text)});if(!s.alive)return;s.revision=result.revision;s.base=text;cache(latest.current);setError('');setStatus(saveText(latest.current)===text?'Saved to your account':'Waiting to save…')}
   catch(e){if(!s.alive)return;if(e.status===409){s.blocked=true;try{const cloud=await api('franchise');if(!s.alive)return;if(saveText(latest.current)===saveText(parse(JSON.stringify(cloud.state)))){useCloud(cloud);s.blocked=false}else{setConflict({local:latest.current,cloud});setStatus('Changes found on another device')}}catch(err){s.blocked=false;setError(err.message)}}else{setError(e.message);setStatus('Not synced — retrying. Keep this page open.')}}
   finally{s.busy=false}
  };
  async function poll(){if(document.hidden||!s.alive||s.busy||s.blocked||!latest.current)return;if(saveText(latest.current)!==s.base){await s.flush();return}s.busy=true;try{const cloud=await api('franchise');if(s.alive&&cloud&&cloud.revision!==s.revision){if(saveText(latest.current)===s.base)useCloud(cloud);else{s.blocked=true;setConflict({local:latest.current,cloud})}}}catch(e){if(s.alive)setError(e.message)}finally{s.busy=false}}
  load();const timer=setInterval(poll,10000);window.addEventListener('focus',poll);
  const leaving=e=>{if(latest.current&&saveText(latest.current)!==s.base){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',leaving);
  return()=>{s.alive=false;clearInterval(timer);window.removeEventListener('focus',poll);window.removeEventListener('beforeunload',leaving)};
 },[data,retry]);
 useEffect(()=>{const s=session.current;if(!ready||!s||!state)return;s.cache(state);if(saveText(state)===s.base||s.blocked)return;setStatus('Waiting to save…');const timer=setTimeout(()=>s.flush(),700);return()=>clearTimeout(timer)},[state,ready]);
 async function choose(which){const s=session.current;if(!s||!conflict)return;s.backup(conflict.local);if(which==='cloud'){s.useCloud(conflict.cloud);s.blocked=false;setConflict(null)}else{s.backup(conflict.cloud.state);s.revision=conflict.cloud.revision;s.blocked=false;setConflict(null);await s.flush()}}
 return {status,ready,error,conflict,choose,retry:()=>setRetry(n=>n+1)};
}
