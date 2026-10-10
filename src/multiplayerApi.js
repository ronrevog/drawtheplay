import {auth} from './firebase';
export async function multiplayerApi(path,data){
 const user=auth.currentUser;if(!user)throw Error('Sign in to play with friends.');
 let timer;const token=await Promise.race([user.getIdToken(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Sign-in timed out. Reload and try again. Your game is saved.')),15000)})]).finally(()=>clearTimeout(timer));
 const controller=new AbortController();const deadline=setTimeout(()=>controller.abort(),20000);
 try{
 const response=await fetch(`/api/multiplayer/${path}`,{method:data?'POST':'GET',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
 const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Unable to load multiplayer.'),{status:response.status});return result;
 }catch(e){if(e.name==='AbortError')throw Error('Connection timed out. Please retry. Your saved game is safe.');throw e}finally{clearTimeout(deadline)}
}
