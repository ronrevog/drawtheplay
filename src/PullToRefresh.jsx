import React,{useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {canPullRefresh,pullDistance,PULL_THRESHOLD} from './pullRefresh.js';
import './pullToRefresh.css';
export function PullToRefresh(){
 const [distance,setDistance]=useState(0),[refreshing,setRefreshing]=useState(false);
 useEffect(()=>{let start=null,pull=0,loading=false,recovery;
  const cancel=()=>{start=null;pull=0;setDistance(0)};
  const reset=()=>{clearTimeout(recovery);loading=false;setRefreshing(false);cancel()};
  const down=e=>{if(loading||e.touches.length!==1||!canPullRefresh(e.target,document))return;start={x:e.touches[0].clientX,y:e.touches[0].clientY};pull=0};
  const move=e=>{if(!start)return;if(e.touches.length!==1||document.body.classList.contains('playing-fullscreen')){cancel();return}const t=e.touches[0];if(t.clientY<start.y||Math.abs(t.clientX-start.x)>Math.max(14,t.clientY-start.y)){cancel();return}pull=pullDistance(start,t);if(pull>8){if(!e.cancelable){cancel();return}e.preventDefault();setDistance(pull)}};
  const up=()=>{if(!start)return;const trigger=pull>=PULL_THRESHOLD;start=null;pull=0;if(trigger){loading=true;setRefreshing(true);setDistance(PULL_THRESHOLD);recovery=setTimeout(reset,4000);try{window.location.reload()}catch{reset()}}else setDistance(0)};
  window.addEventListener('pageshow',reset);
  document.addEventListener('touchstart',down,{passive:true});document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',up);document.addEventListener('touchcancel',cancel);
  return()=>{clearTimeout(recovery);window.removeEventListener('pageshow',reset);document.removeEventListener('touchstart',down);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',up);document.removeEventListener('touchcancel',cancel)};
 },[]);
 return distance>8?<div className={`pull-refresh ${refreshing?'refreshing':''}`} role="status" style={{transform:`translate(-50%,${Math.min(distance*.5,55)}px)`}}><RefreshCw size={18}/><span>{refreshing?'Refreshing…':distance>=PULL_THRESHOLD?'Release to refresh':'Pull to refresh'}</span></div>:null;
}
