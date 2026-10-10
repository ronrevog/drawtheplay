import React,{useEffect,useState} from 'react';
import {Users} from 'lucide-react';
import {multiplayerApi} from './multiplayerApi';
export function FriendInboxButton({onClick}){
 const [count,setCount]=useState(0);
 useEffect(()=>{let alive=true;async function check(){if(document.hidden)return;try{const matches=await multiplayerApi('matches');if(alive)setCount(matches.filter(m=>(m.status==='invited'&&m.side!=='home')||(m.status==='active'&&!m.submitted)).length)}catch{/* Opening the inbox shows a retryable error. */}}check();const timer=setInterval(check,30000);return()=>{alive=false;clearInterval(timer)}},[]);
 return <button className="friend-inbox-button" onClick={onClick} aria-label={`Friends${count?` · ${count} invitations or turns waiting`:''}`}><Users size={19}/><span>Friends</span>{count>0&&<b>{count}</b>}</button>;
}
