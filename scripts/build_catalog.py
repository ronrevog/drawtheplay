"""Refresh nflverse data and build deterministic, explicitly estimated DTP ratings."""
import argparse,csv,datetime,hashlib,json,math,urllib.request
from pathlib import Path
from collections import Counter,defaultdict
ROOT=Path(__file__).resolve().parents[1]
BASE='https://github.com/nflverse/nflverse-data/releases/download/'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--season',type=int,default=2026);ap.add_argument('--cache',type=Path,default=ROOT/'cache');ap.add_argument('--refresh',action='store_true');a=ap.parse_args();a.cache=a.cache/str(a.season);a.cache.mkdir(parents=True,exist_ok=True)
 urls={'combine':f'{BASE}combine/combine.csv','rosters':f'{BASE}rosters/roster_{a.season}.csv','depth':f'{BASE}depth_charts/depth_charts_{a.season}.csv','stats2025':f'{BASE}stats_player/stats_player_reg_{a.season-1}.csv','stats2026':f'{BASE}stats_player/stats_player_reg_{a.season}.csv'}
 def read(key):
  path=a.cache/(key+'.csv')
  if a.refresh or not path.exists():path.write_bytes(urllib.request.urlopen(urls[key],timeout=60).read())
  return list(csv.DictReader(path.open()))
 roster=read('rosters');assert all(r['season']==str(a.season) for r in roster), 'Wrong roster season';depth=read('depth'); latest=max(r['dt'] for r in depth);ranks={}
 for r in depth:
  if r['dt']==latest and r['gsis_id'] and r['pos_rank']:
   key=(r['gsis_id'],r['team']);ranks[key]=min(ranks.get(key,99),int(r['pos_rank']))
 combine={}
 for row in read('combine'):
  if row['pfr_id'] and (row['pfr_id'] not in combine or int(row['season'])>int(combine[row['pfr_id']]['season'])):combine[row['pfr_id']]=row
 stats=[{r['player_id']:r for r in read(k)} for k in ['stats2025','stats2026']]
 def num(r,k):
  try:return float(r.get(k) or 0)
  except ValueError:return 0
 def measured(r,k):
  try:return float(r[k]) if r.get(k) not in [None,''] else None
  except ValueError:return None
 def season_stats(r):
  keys=['games','completions','attempts','passing_yards','passing_tds','passing_interceptions','passing_epa','passing_cpoe','sacks_suffered','carries','rushing_yards','rushing_tds','rushing_fumbles_lost','targets','receptions','receiving_yards','receiving_tds','receiving_yards_after_catch','def_tackles_solo','def_tackle_assists','def_tackles_for_loss','def_sacks','def_qb_hits','def_interceptions','def_pass_defended','def_fumbles_forced','fg_made','fg_att','fg_long','pat_made','pat_att','pt_att','pt_yards','pt_net_yards','pt_inside_20','penalties','penalty_yards']
  return {k:measured(r,k) for k in keys}
 def performance(r,pos):
  g=max(1,num(r,'games'))
  if pos=='QB':return (num(r,'passing_yards')/25+num(r,'passing_tds')*4-num(r,'passing_interceptions')*3+num(r,'rushing_yards')/10)/g
  if pos in ['RB','WR','TE']:return (num(r,'rushing_yards')+num(r,'receiving_yards')+30*(num(r,'rushing_tds')+num(r,'receiving_tds')))/g
  if pos in ['DL','LB','DB']:return (num(r,'def_tackles_solo')+num(r,'def_tackle_assists')*.4+num(r,'def_sacks')*5+num(r,'def_qb_hits')+num(r,'def_interceptions')*7+num(r,'def_pass_defended')*2)/g
  if pos=='K':return (num(r,'fg_made')+8*.8)/(num(r,'fg_att')+8)*100+min(15,num(r,'fg_att'))
  if pos=='P':return (num(r,'pt_net_yards')+400)/(num(r,'pt_att')+10)
  return None
 players=[];seen=set()
 for r in roster:
  if not r['gsis_id']:continue
  if r['gsis_id'] in seen:raise ValueError('Duplicate roster ID')
  seen.add(r['gsis_id']);pos=r['position'];prev=stats[0].get(r['gsis_id'],{});curr=stats[1].get(r['gsis_id'],{})
  games=[num(prev,'games'),num(curr,'games')];values=[performance(prev,pos),performance(curr,pos)];weights=[min(games[0],17)*.6,min(games[1],17)]
  value=sum((v or 0)*w for v,w in zip(values,weights))/sum(weights) if sum(weights) and values[0] is not None else None
  rank=ranks.get((r['gsis_id'],r['team']),4);role={1:79,2:71,3:65}.get(rank,60)
  players.append(dict(id=r['gsis_id'],name=r['full_name'],team=r['team'],position=pos,detailPosition=r['depth_chart_position'] or pos,status=r['status'],statusDetail=r['status_description_abbr'],eligible=r['status'] in ['ACT','INA'],number=r['jersey_number'],photo=r['headshot_url'] or None,depth=rank,games=games,value=value,role=role,stats={k:num(curr,k) for k in ['games','passing_yards','passing_tds','rushing_yards','receiving_yards','receptions','def_tackles_solo','def_sacks','def_interceptions','fg_made','fg_att','pt_net_yards','pt_att']},experience=num(r,'years_exp')))
  p=players[-1];c=combine.get(r['pfr_id'],{})
  p['bio']={'heightInches':measured(r,'height'),'weightLbs':measured(r,'weight'),'birthDate':r['birth_date'] or None,'college':r['college'] or None,'experienceYears':measured(r,'years_exp'),'entryYear':measured(r,'entry_year'),'draftTeam':r['draft_club'] or None,'draftPick':measured(r,'draft_number')}
  p['combine']={'year':measured(c,'season'),'fortySeconds':measured(c,'forty'),'benchReps':measured(c,'bench'),'verticalInches':measured(c,'vertical'),'broadJumpInches':measured(c,'broad_jump'),'threeConeSeconds':measured(c,'cone'),'shuttleSeconds':measured(c,'shuttle')}
  p['seasonStats']={str(a.season-1):season_stats(prev),str(a.season):season_stats(curr)}
 groups=defaultdict(list)
 for p in players:
  if p['eligible'] and p['value'] is not None:groups[p['position']].append(p['value'])
 for p in players:
  vals=groups[p['position']];v=p.pop('value');support=min(1,(p['games'][0]*.6+p['games'][1])/10)
  percentile=(sum(x<v for x in vals)+.5*sum(x==v for x in vals))/len(vals) if vals and v is not None else None
  production=round(60+38*percentile) if percentile is not None else None
  overall=round(p.pop('role')*(1-.72*support)+(production or 70)*.72*support) if production is not None else {1:79,2:71,3:65}.get(p['depth'],60)
  p['overall']=max(60,min(98,overall));p['confidence']='Stat-informed' if support>=.7 and production is not None else 'Limited data' if production is not None else 'Role estimate'
  p['ratingBasis']='Position-relative production blended with latest depth-chart role; sample-size adjusted.' if production is not None else 'Depth-chart role only; no reliable individual performance measure in these feeds.'
  p['attributes']={'Production':production,'Role':{1:79,2:71,3:65}.get(p['depth'],60),'Experience':min(95,60+int(p['experience'])*3)}
  factor={'QB':1.35,'OL':1.1,'DL':1.1,'K':.7,'P':.65,'LS':.5}.get(p['position'],1)
  p['cost']=int(round(1000*2**((p['overall']-60)/10)*factor/50)*50);p['starter']=False
 active=[p for p in players if p['eligible']];target=round(len(active)*.2);position_groups=defaultdict(list)
 for p in active:
  if p['overall']<=80:position_groups[p['position']].append(p)
 # Proportional position quotas with stable identity-based sampling; no random rerolls.
 counts=Counter(p['position'] for p in active);chosen=[]
 for pos,pool in sorted(position_groups.items()):
  pool.sort(key=lambda p:hashlib.sha256(('dtp-v1:'+p['id']).encode()).hexdigest())
  quota=max(3,int(target*counts[pos]/len(active)));chosen.extend(pool[:quota])
 rest=sorted([p for pool in position_groups.values() for p in pool if p not in chosen],key=lambda p:hashlib.sha256(p['id'].encode()).hexdigest())
 chosen=(chosen+rest[:max(0,target-len(chosen))])[:target]
 for p in chosen:p['starter']=True
 assert len(chosen)==target and all(p['overall']<=80 for p in chosen)
 assert len({p['team'] for p in active})==32
 data={'version':'dtp-ratings-v1','season':a.season,'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'depthSnapshot':latest,'sources':urls,'activeCount':len(active),'starterCount':len(chosen),'excludedMissingIds':sum(not r['gsis_id'] for r in roster),'players':players}
 out=ROOT/'public/data/catalog.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(data,separators=(',',':')))
 print(json.dumps({'players':len(players),'eligible':len(active),'starter':len(chosen),'positions':Counter(p['position'] for p in chosen),'ratingRange':[min(p['overall'] for p in active),max(p['overall'] for p in active)],'headshots':sum(bool(p['photo']) for p in active)},indent=2))
if __name__=='__main__':main()
