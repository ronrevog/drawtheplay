// One-time account gift; the marker travels with cloud saves and backups.
export function applyWelcomeGrant(state){
 if(!state||typeof state!=="object")return state;
 return {...state,unlimitedTokens:false,welcomeGrant20261010:true,
 credits:state.credits+(state.welcomeGrant20261010===true?0:200000),
 tokens:state.tokens+(state.welcomeGrant20261010===true?0:100)};
}
