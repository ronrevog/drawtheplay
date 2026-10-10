export const PULL_THRESHOLD=90;
export function pullDistance(start,touch){
 const y=touch.clientY-start.y,x=Math.abs(touch.clientX-start.x);
 return y>0&&y>x*1.3?y:0;
}
export function canPullRefresh(target,doc){
 if(doc.querySelector?.('.pc-session-loading')||doc.body.classList.contains('playing-fullscreen')||(doc.scrollingElement?.scrollTop||0)>1)return false;
 if(!(target instanceof doc.defaultView.Element)||target.closest('input,textarea,select,button,a,[contenteditable],dialog,[role="dialog"],.modal-backdrop,.live-game,.mp-game,.all22-field,.notification-dropdown'))return false;
 for(let el=target;el&&el!==doc.body&&el!==doc.documentElement;el=el.parentElement){const style=doc.defaultView.getComputedStyle(el);if(/auto|scroll/.test(style.overflowY)&&el.scrollHeight>el.clientHeight+1)return false;}
 return true;
}
