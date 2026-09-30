import {NFL_COLORS} from './teamColors.js';
const fictional=[
 ['wildcats','Wildcats','#F47321','#005030','#FFFFFF','Pearl white shell, green facemask, orange-green center stripe, original fierce wildcat head decal in orange and green.'],
 ['sabers','Sabers','#142840','#E4B74C','#E9EEF4','Midnight navy shell, gold facemask, two crossed curved sabers on a small silver shield.'],
 ['orcas','Orcas','#071E2A','#22BED0','#FFFFFF','Deep ocean shell, white facemask, original leaping black-and-white orca with a turquoise wave.'],
 ['knights','Knights','#242831','#B9C3CF','#D9AE56','Metallic silver shell, charcoal facemask, original angular knight visor crest in charcoal and gold.'],
 ['reds','Reds','#C62832','#FFF0D4','#22252B','Glossy red shell, cream facemask, original proud rooster head decal with cream feathers and charcoal outlines.'],
 ['thunderbirds','Thunderbirds','#472C85','#F5C64F','#E7EAF1','Purple shell, gold facemask, original geometric thunderbird with broad gold wings.'],
 ['copperheads','Copperheads','#B66B3F','#102E2A','#F3E4C9','Metallic copper shell, forest facemask, original coiled copperhead snake decal in forest and cream.'],
 ['glaciers','Glaciers','#9DDCF2','#17395F','#FFFFFF','Ice blue pearl shell, navy facemask, original jagged white glacier peak decal with navy outlines.'],
 ['outlaws','Outlaws','#272329','#C44B38','#D8C8AB','Matte charcoal shell, rusty red facemask, original masked western outlaw face decal in bone and red.'],
 ['sentinels','Sentinels','#2344A5','#D1D9E3','#F06D35','Royal blue shell, silver facemask, original shield and watchtower decal with an orange central accent.'],
 ['stingrays','Stingrays','#007F82','#EC5C83','#E8F5F3','Teal shell, pale silver facemask, original sleek stingray silhouette in pink and white.'],
 ['bison','Bison','#624633','#D6A64F','#F5E8CC','Deep earth-brown shell, gold facemask, original charging bison head decal in cream and gold.'],
 ['firebirds','Firebirds','#9C263B','#FF9C35','#F8DD8D','Burgundy shell, amber facemask, original rising phoenix decal with orange and pale-gold feathers.'],
 ['ironclads','Ironclads','#414B59','#36B7B0','#D5DBDF','Gunmetal shell, teal facemask, original riveted armored ship prow decal in silver and teal.'],
 ['jackals','Jackals','#BE9B59','#25203D','#F1E6CD','Sand-gold shell, dark plum facemask, original angular jackal head decal in plum and cream.'],
 ['redwoods','Redwoods','#194A3B','#BB633D','#F0DFBC','Forest green shell, copper facemask, original towering redwood tree decal in cream with copper outlines.'],
 ['comets','Comets','#342A75','#FF7045','#D6EBFF','Indigo shell, ice-blue facemask, original flaming comet decal with a coral trail.'],
 ['krakens','Krakens','#38274A','#24A5A1','#D9C5F1','Dark plum shell, aqua facemask, original tentacled kraken head decal in aqua and lavender.'],
 ['roadrunners','Roadrunners','#D45B2A','#25495E','#F7DEAD','Burnt orange shell, slate-blue facemask, original sprinting roadrunner bird decal in cream and blue.'],
 ['monarchs','Monarchs','#652C70','#E1B950','#F1E5D5','Royal plum shell, gold facemask, original bold crowned lion face decal in gold and ivory.']
];
export const FICTIONAL_TEAMS=fictional.map(([id,name,primary,secondary,tertiary,design])=>({id,name,primary,secondary,tertiary,design,kind:'fictional',helmet:`/helmets/${id}.png`}));
const codes='ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LA LAC LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' ');
export const PRO_TEAMS=codes.map(code=>({id:`pro-${code.toLowerCase()}`,code,...NFL_COLORS[code],tertiary:'#FFFFFF',kind:'pro',helmet:`/helmets/pro-${code.toLowerCase()}.png`}));
export const TEAM_IDENTITIES=[...FICTIONAL_TEAMS,...PRO_TEAMS];
export const findIdentity=id=>TEAM_IDENTITIES.find(t=>t.id===id);
export function identityFields(id){const t=findIdentity(id);return t?{teamIdentity:t.id,name:t.name,color:t.primary,secondaryColor:t.secondary,tertiaryColor:t.tertiary}:{teamIdentity:null};}
function customFields(value){const result={};if(typeof value?.name==='string')result.name=value.name.slice(0,30);for(const key of ['color','secondaryColor','tertiaryColor'])if(/^#[0-9a-f]{6}$/i.test(value?.[key]))result[key]=value[key];return result}
export function selectIdentity(state,id){if(state.game)state={...state,game:{...state.game,teamIdentity:state.game.teamIdentity===undefined?state.teamIdentity:state.game.teamIdentity,color:state.game.color||state.color,secondaryColor:state.game.secondaryColor||state.secondaryColor,tertiaryColor:state.game.tertiaryColor||state.tertiaryColor}};const selected=findIdentity(id);if(selected)return {...state,customIdentity:state.teamIdentity?state.customIdentity:{name:state.name,color:state.color,secondaryColor:state.secondaryColor,tertiaryColor:state.tertiaryColor},...identityFields(id)};return {...state,...customFields(state.customIdentity),teamIdentity:null}}
export const proIdentity=code=>PRO_TEAMS.find(t=>t.code===({LAR:'LA',STL:'LA',OAK:'LV',SD:'LAC'}[code]||code));
