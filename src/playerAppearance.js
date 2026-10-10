import appearances from './player-appearance.json';

// Headshot-derived visible complexion only; no ethnicity labels or name inference.
// Missing/ambiguous headshots retain a neutral placeholder until reviewed.
export function playerSkinTone(player){return /^#[0-9a-f]{6}$/i.test(player?.skinTone)?player.skinTone:appearances[player?.id]||'#a57959'}
export function materialColor(role,shade,palette,skin,opponent=palette,opponentSkin=skin){
 const hex=({1:palette.primary,2:palette.secondary,3:palette.tertiary||'#ffffff',4:skin,5:opponent.primary,6:opponent.secondary,7:opponent.tertiary||'#ffffff',8:opponentSkin})[role];
 if(!hex)return null;
 const light=Math.max(.2,shade/255);
 return [1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*light));
}
