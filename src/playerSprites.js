// Undefined means loading; null means the optional artwork is unavailable.
// Cache the resolved value as well as the promise to avoid a flash on remount.
export function createSpriteCache(load){
 let value,promise;
 return {get:()=>value,load:()=>promise??=(Promise.resolve().then(load).catch(()=>null).then(pack=>(value=pack)))};
}
const cache=createSpriteCache(async()=>{
 const response=await fetch('/local-reference/fps-decoded.json',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Player artwork unavailable');
 const data=await response.json();
 const image=await new Promise((resolve,reject)=>{
  const image=new Image(),timer=setTimeout(()=>{image.onload=image.onerror=null;reject(Error('Player artwork timed out'))},10000);
  image.onerror=()=>{clearTimeout(timer);reject(Error('Player artwork unavailable'))};
  image.onload=()=>{clearTimeout(timer);resolve(image)};
  image.src='/local-reference/fps-sprite-atlas.png';
 });
 return {...data,image,byName:Object.fromEntries(data.animations.map(a=>[a.name,a]))};
});
export const loadPlayerSprites=cache.load;
export const getPlayerSprites=cache.get;
