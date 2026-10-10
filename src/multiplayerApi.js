import {auth} from './firebase';
export async function multiplayerApi(path,data){
 const user=auth.currentUser;if(!user)throw Error('Sign in to play with friends.');
 const token=await user.getIdToken();
 const response=await fetch(`/api/multiplayer/${path}`,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
 const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Unable to load multiplayer.'),{status:response.status});return result;
}
