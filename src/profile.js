export function heightLabel(inches){return Number.isFinite(inches)?`${Math.floor(inches/12)}′ ${inches%12}″`:'Not reported'}
export function ageAt(birthDate,asOf){if(!birthDate)return null;const birth=new Date(birthDate),date=new Date(asOf);if(!Number.isFinite(+birth)||!Number.isFinite(+date))return null;return date.getUTCFullYear()-birth.getUTCFullYear()-((date.getUTCMonth()<birth.getUTCMonth()||(date.getUTCMonth()===birth.getUTCMonth()&&date.getUTCDate()<birth.getUTCDate()))?1:0)}
export function rate(n,d,multiplier=1){return Number.isFinite(n)&&Number.isFinite(d)&&d>0?n/d*multiplier:null}
export const STAT_GROUPS={
 QB:[['Passing',['completions','attempts','passing_yards','passing_tds','passing_interceptions','sacks_suffered','passing_epa','passing_cpoe']],['Rushing',['carries','rushing_yards','rushing_tds']]],
 RB:[['Rushing',['carries','rushing_yards','rushing_tds','rushing_fumbles_lost']],['Receiving',['targets','receptions','receiving_yards','receiving_tds','receiving_yards_after_catch']]],
 WR:[['Receiving',['targets','receptions','receiving_yards','receiving_tds','receiving_yards_after_catch']],['Rushing',['carries','rushing_yards','rushing_tds']]],
 TE:[['Receiving',['targets','receptions','receiving_yards','receiving_tds','receiving_yards_after_catch']]],
 K:[['Kicking',['fg_made','fg_att','fg_long','pat_made','pat_att']]],
 P:[['Punting',['pt_att','pt_yards','pt_net_yards','pt_inside_20']]],
 OL:[['Discipline',['penalties','penalty_yards']]],
 LS:[['Discipline',['penalties','penalty_yards']]],
};
export const DEFENSE=[['Defense',['def_tackles_solo','def_tackle_assists','def_tackles_for_loss','def_sacks','def_qb_hits','def_interceptions','def_pass_defended','def_fumbles_forced']]];
export const LABELS={games:'Games played',completions:'Completions',attempts:'Pass attempts',passing_yards:'Passing yards',passing_tds:'Passing TDs',passing_interceptions:'Interceptions thrown',sacks_suffered:'Sacks taken',passing_epa:'Passing EPA',passing_cpoe:'Completion % over expected',carries:'Carries',rushing_yards:'Rushing yards',rushing_tds:'Rushing TDs',rushing_fumbles_lost:'Rushing fumbles lost',targets:'Targets',receptions:'Receptions',receiving_yards:'Receiving yards',receiving_tds:'Receiving TDs',receiving_yards_after_catch:'Yards after catch',def_tackles_solo:'Solo tackles',def_tackle_assists:'Tackle assists',def_tackles_for_loss:'Tackles for loss',def_sacks:'Sacks',def_qb_hits:'QB hits',def_interceptions:'Interceptions',def_pass_defended:'Passes defended',def_fumbles_forced:'Forced fumbles',fg_made:'Field goals made',fg_att:'Field goal attempts',fg_long:'Longest field goal · yd',pat_made:'Extra points made',pat_att:'Extra point attempts',pt_att:'Punts',pt_yards:'Gross punt yards',pt_net_yards:'Net punt yards',pt_inside_20:'Punts inside 20',penalties:'Penalties',penalty_yards:'Penalty yards'};
