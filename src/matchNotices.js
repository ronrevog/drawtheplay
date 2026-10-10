export function matchNotice(m){
 if(m.host?.startsWith('cpu:')||m.guest?.startsWith('cpu:'))return null;
 const opponent=m.side==='home'?m.guestName:m.hostName;
 let title,body;
 if(m.status==='invited'&&m.side!=='home'){title=`${opponent||'A player'} invited you`;body=`Challenge from ${m.hostTeam}. Accept or decline.`}
 else if(m.status==='active'&&!m.submitted){title=`Your turn against ${opponent||'your friend'}`;body=`${m.hostTeam} ${m.game?.state.score.home??0} – ${m.game?.state.score.away??0} ${m.guestTeam} · Q${m.game?.state.quarter??1}. Choose your play and snap.`}
 else if(['complete','forfeited'].includes(m.status)){title=`Game finished against ${opponent||'your friend'}`;body=`${m.hostTeam} ${m.game?.state.score.home??0} – ${m.game?.state.score.away??0} ${m.guestTeam}${m.status==='forfeited'?' · Forfeit':''}`}
 else return null;
 return {id:`${m.id}:${m.status}:${m.game?.state.turn??0}`,matchId:m.id,title,body,updated:m.updated};
}
