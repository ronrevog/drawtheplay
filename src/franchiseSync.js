import {DEFAULT_PLAYS} from './playbook.js';
// Persist game progress, not transient replay frames or catalog copies in results.
export function saveText(state){return JSON.stringify(state,(key,value)=>key==='simulation'?undefined:value)}
export function hasProgress(s){return !!(s?.roster?.length||s?.history?.length||s?.unlocked?.length||s?.game||s?.teamIdentity||s?.name&&s.name!=='My franchise'||s?.credits!==200000||s?.tokens!==100||JSON.stringify(s?.plays)!==JSON.stringify(DEFAULT_PLAYS))}
export function reconcileSave(local,base,cloud){
 if(!cloud)return 'upload';
 if(local===cloud)return 'cloud';
 if(base&&local===base)return 'cloud';
 if(base&&cloud===base)return 'upload';
 return 'conflict';
}
