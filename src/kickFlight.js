// Field coordinates and elevations are in yards. The score and animation use
// the same trajectory at the plane of the end-line goal posts.
export const GOAL={center:26.65,halfWidth:18.5/6,crossbar:10/3};
const G=10.73;
export function kickPosition(flight,time){
 const t=Math.max(0,Math.min(time,flight.groundTime));
 return {x:GOAL.center+flight.vx*t,y:flight.launchY+flight.vy*t,z:Math.max(0,flight.vz*t-G*t*t/2)};
}
export function createKickFlight({launchY,goalY,rating,rng}){
 // Leg strength varies the range; accuracy varies launch direction. No
 // preselected make/miss or last-frame height correction.
 const range=Math.max(32,65+(rating-75)*.4+rng.normal(0,5));
 const vz=18+rng.range(-1,1),groundTime=2*vz/G,vy=range/groundTime;
 const slope=rng.normal(0,Math.max(.018,.036+(75-rating)*.0005));
 const flight={launchY,goalY,vx:vy*slope,vy,vz,groundTime};
 const crossingTime=(goalY-launchY)/vy;
 const crossing=crossingTime<=groundTime?kickPosition(flight,crossingTime):null;
 const good=!!crossing&&crossing.z>GOAL.crossbar&&Math.abs(crossing.x-GOAL.center)<GOAL.halfWidth;
 const outcome=!crossing||crossing.z<=GOAL.crossbar?'Short':crossing.x<=GOAL.center-GOAL.halfWidth?'Wide left':crossing.x>=GOAL.center+GOAL.halfWidth?'Wide right':'GOOD';
 return {...flight,crossingTime,crossing,good,outcome,endTime:Math.min(groundTime,crossingTime+.65)};
}
