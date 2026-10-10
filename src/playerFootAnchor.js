// Use the visible soles, excluding transparent padding in the sprite cell.
export function playerFootAnchor(pixels,width,height){
 let bottom=-1;
 for(let y=height-1;y>=0&&bottom<0;y--)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){bottom=y;break}
 if(bottom<0)return {x:width/2,y:height};
 let left=width,right=-1;
 for(let y=Math.max(0,bottom-2);y<=bottom;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x)}
 return {x:(left+right+1)/2,y:bottom+1};
}
export function spriteFootPoint(at,ref,sprite,foot,scale){
 return {x:Math.round(at.x+ref.x*scale)+(ref.flags&2?sprite.width-foot.x:foot.x)*scale,
  y:Math.round(at.y+ref.y*scale)+foot.y*scale};
}
