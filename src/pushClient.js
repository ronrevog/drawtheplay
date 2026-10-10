import {multiplayerApi as api} from './multiplayerApi';
export async function currentPush(){if(!('serviceWorker' in navigator))return null;const r=await navigator.serviceWorker.getRegistration('/push-sw.js');return r?.pushManager.getSubscription()}
export async function disablePush(){const sub=await currentPush();if(sub){await sub.unsubscribe();await api('push',{action:'disable',subscription:sub.toJSON()}).catch(()=>{})}}
