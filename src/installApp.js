// Capture the browser's install offer before sign-in or notification settings mount.
let pending=null,installed=false;
const listeners=new Set();
function emit(){for(const listener of listeners)listener()}
if(typeof window!=='undefined'){
 installed=!!(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;emit()});
 window.addEventListener('appinstalled',()=>{installed=true;pending=null;emit()});
 window.matchMedia?.('(display-mode: standalone)').addEventListener('change',event=>{installed=event.matches;emit()});
}
export const installState=()=>({available:!!pending,installed});
export function observeInstall(listener){listeners.add(listener);return()=>listeners.delete(listener)}
export async function promptInstall(){const event=pending;if(!event)return 'unavailable';pending=null;emit();await event.prompt();return (await event.userChoice).outcome}
