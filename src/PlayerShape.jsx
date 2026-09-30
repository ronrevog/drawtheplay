import React from 'react';
// Equal painted area: square side = sqrt(pi) * circle radius.
export function PlayerShape({side,x,y,r,palette,selected=false}){
 const half=side==='offense'?r:r*Math.sqrt(Math.PI)/2;
 const shape=side==='offense'?<circle cx={x} cy={y} r={r}/>:<rect x={x-half} y={y-half} width={half*2} height={half*2}/>;
 return <g data-player-shape={side==='offense'?'circle':'square'} data-team-color={palette.primary}>
 {selected&&(side==='offense'?<circle cx={x} cy={y} r={r+.25} fill="none" stroke="#fff" strokeWidth=".13"/>:<rect x={x-half-.25} y={y-half-.25} width={half*2+.5} height={half*2+.5} fill="none" stroke="#fff" strokeWidth=".13"/>)}
 <g fill={palette.primary} stroke={palette.secondary} strokeWidth={r*.22}>{shape}</g></g>
}
