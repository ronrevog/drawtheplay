// Flight heading follows the same projected coordinates as the field.
// Keep native ball-carrying player frames from getting a second ball overlaid.
export function footballPose(frame,frames,time,hasCarrierSprite=false){
 const ball=frame?.ball;if(!ball)return null;
 const carrier=frame.players?.find(p=>p.slot===frame.carrier);
 const held=carrier&&Math.hypot(carrier.x-ball.x,carrier.y-ball.y)<.8;
 if(held&&hasCarrierSprite)return null;
 let a=frames?.[0],b=a;
 for(let i=1;i<(frames?.length||0);i++){a=frames[i-1];b=frames[i];if(b.t>=time)break}
 const dx=(b?.ball?.x??ball.x)-(a?.ball?.x??ball.x),dy=(b?.ball?.y??ball.y)-(a?.ball?.y??ball.y);
 const flying=!held&&ball.z>.5&&Math.hypot(dx,dy)>.001&&time<(frames?.at(-1)?.t??0);
 return {angle:frame.ballAngle??(flying?Math.atan2(-dy,dx):-Math.PI/2),spin:flying?.82+.18*Math.cos(time*32):1,height:held?1.4:Math.max(0,ball.z||0),held:!!held};
}
