// Curated game editions, not current roster records or historical stat claims.
const editions=[
 ['dan-marino','Dan Marino','MIA','13',97,12500,'#53d4cf','Quick release · pocket passer',{accuracy:98,vision:96,topSpeed:6.3,elusiveness:65}],
 ['joe-montana','Joe Montana','SF','16',98,13000,'#eac576','Precision · composed field general',{accuracy:99,vision:98,topSpeed:7.1,elusiveness:82}],
 ['brett-favre','Brett Favre','GB','4',96,12000,'#e8c957','Aggressive passer · mobile playmaker',{accuracy:92,vision:93,topSpeed:7.5,elusiveness:89}],
 ['peyton-manning','Peyton Manning','IND','18',98,13000,'#84b5ff','Pre-snap vision · precision passer',{accuracy:98,vision:99,topSpeed:6.1,elusiveness:62}],
 ['jim-kelly','Jim Kelly','BUF','12',95,11500,'#8bbaff','No-huddle field general · balanced passer',{accuracy:95,vision:96,topSpeed:7,elusiveness:80}]
];
export const LEGEND_PLAYERS=editions.map(([slug,name,team,number,overall,cost,color,archetype,traits])=>({
 id:`legend-${slug}`,name,team,number,overall,cost,color,archetype,legend:true,
 position:'QB',detailPosition:'QB',status:'LEGEND',eligible:false,starter:false,depth:99,
 photo:`/packs/legend-${slug}.png`,skinTone:'#c18f72',bio:{},combine:{},seasonStats:{},stats:{},games:[],
 confidence:'Curated legend edition',ratingBasis:'Playing-prime game interpretation. Ratings are design estimates; no current-season or historical statistics are implied.',
 attributes:{Accuracy:traits.accuracy,Vision:traits.vision,Elusiveness:traits.elusiveness},legendTraits:traits
}));
export const LEGEND_PACKS=LEGEND_PLAYERS.map(p=>({id:p.id,name:p.name,cost:20,color:p.color,legend:true,count:1,ids:[p.id],description:`${p.archetype}. Guaranteed ${p.overall} OVR legend unlock.`}));
export function withLegendPlayers(players){return [...players.filter(p=>!LEGEND_PLAYERS.some(l=>l.id===p.id)),...LEGEND_PLAYERS]}
