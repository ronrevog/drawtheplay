# Football simulation, version 2

The engine resolves the play from moving players and the ball at 20 steps per second. The replay interpolates those recorded positions; the scoreboard uses the same result. It does not choose yardage first and animate a story afterward.

## Execution

- **Movement:** acceleration, braking, cuts, turning, body separation, and modest fatigue during long plays. Historical 40-yard times are blended with positional speed estimates, rather than treating a combine sprint as present-day game speed. Mass, height, bench, cone and shuttle measurements influence estimates when available.
- **Protection:** blockers receive initial rush responsibilities. Unoccupied linemen help inside or pick up leaks. Blockers move to fit their assignments, engage on physical contact, stay paired with the defender, and drive or yield before a shed. Skill, mass, estimated strength, leverage, block direction and seeded execution affect contact duration. Engaged rushers cannot simply run through their blocker. Contact preserves its angle rather than snapping both players into a vertical stack.
- **Run game:** quarterback/running back mesh requires proximity. The runner follows the authored direction while evaluating nearby lanes, defenders and traffic. Eligible teammates transition to downfield blocks with weaker, shorter engagements than offensive linemen. Tackles account for proximity, closing speed, size, estimated elusiveness and nearby support. Broken tackles have a retry cooldown.
- **Passing:** dropback, settling, ordered reads, route development, throwing-lane checks, anticipation, pressure response and release time happen before ball flight. Accuracy reflects distance, estimated QB accuracy, movement and pressure. The receiver tracks the ball; catches require reach and in-bounds position. Interceptions require physical proximity to the ball at a reachable height.
- **Defense:** man assignments retain leverage. Zone defenders cover areas, match threats and carry seams instead of abandoning receivers at a fixed depth. Defenders have reaction delays. Only players with a plausible play on the throw attack its catch point; others retain containment. Blitz varies between five-man pressure and a six-man edge overload, with coverage behind it, rather than an unconditional seven-man rush. Pursuit considers the runner's direction and speed.
- **Clock:** scrimmage time includes the recorded play duration; in-bounds plays add between-play runoff. Incompletions, turnovers and out-of-bounds plays stop that runoff.

## Watching and reviewing

Offense is circular; defense is square. Both have equal filled area. Team colors persist when possession changes.

The field shows active block connections: blue for pass protection and amber for run blocking. During a play, tap a player to see their responsibility, status, movement speed and a relevant estimated skill. The top controls allow pause, half speed, normal speed and double speed. Replay last play reuses the original frames and does not advance the game or award rewards again. The camera follows the ball; Full field remains available.

## Validation

Run `npm test`, `npm run build` and `npm run sim:audit` from this directory.

The automated tests include sustained contact, no duplicate engaged defenders, stronger/ weaker line comparisons with matched seeds, progressive acceleration and turns, equal marker area, legitimate catch/throw timing, carried-ball continuity, and 120 play/coverage combinations without player teleportation or forced time-limit whistles. Existing tests simulate 100 full games and validate downs, clock transitions, scoring, saved rosters and reward accounting.

`simulation-audit.json` is a reproducible 240-play behavior report using the catalog rosters. Its averages describe this engine and this deliberately balanced set of play calls. They are not NFL benchmark statistics. Statistical calibration against representative NFL play and tracking data remains unfinished. Browser interaction and appearance were not visually verified in this session.

## Data limits and remaining simplifications

The catalog does not supply reliable individual pass-block, run-block, coverage or tackling grades. The corresponding game skills are estimates based on overall rating, position, experience and available measurements. A combine result may be many years old. Do not present these estimates as measured current NFL skill ratings.

This is a local football game model, not a biomechanical or tracking-trained simulator. Protection is assignment-and-contact based, not a full implementation of every NFL slide, stunt, combo block or line call. There is no penalty officiating, full season fatigue/injury model, defensive interception return, or full special-teams penalty officiating. Kickoffs, punts and placekicks now use the dedicated specialTeams.js model described below. The final time cap is a safety fallback, not a normal intended play ending.

## Design references

The NFL's public work helped identify relevant dimensions, without importing their proprietary models or claiming equivalent accuracy:

- [NFL Football Operations: Next Gen Stats](https://operations.nfl.com/gameday/technology/nfl-next-gen-stats)
- [NFL: Introduction to pressure probability](https://www.nfl.com/news/next-gen-stats-introduction-to-pressure-probability)
- [NFL: Introduction to completion probability](https://www.nfl.com/news/next-gen-stats-introduction-to-completion-probability-0ap3000000964655)
- [NFL: Introduction to expected rushing yards](https://www.nfl.com/news/next-gen-stats-intro-to-expected-rushing-yards)

Implementation: `src/footballPhysics.js` owns movement and traits; `src/liveSimulation.js` owns play execution; `src/practice.js` applies game rules; `src/FullFieldGame.jsx` renders and replays the recorded play.

## Special teams and 53-man squads

Roster capacity is 53. Fill essentials retains the 25-player minimum needed to play; Fill 53-man roster adds positional depth (3 QB, 4 RB, 6 WR, 3 TE, 9 OL, 9 DL, 6 LB, 10 DB, K, P, LS). Existing extra players are retained. Starting funds are 100,000 credits; old saves receive 25,000 additional credits once, tracked by budgetVersion.

The in-game Plays menu contains dynamic kickoff, punt, field goal and extra point calls. Punt and field-goal selections preview the special unit before the snap. Each unit uses 11 unique roster players; kickers, punters, long snappers and holders have dedicated roles.

Kickoff uses the dynamic formation: ten coverage players at the receiving 40, seven setup players at the receiving 35 and two more in the setup zone, plus two returners. Coverage and setup lines hold until landing. Untouched end-zone kicks result in a 35-yard touchback (20 from midfield). The current model generates direct landings; bouncing kicks, onside kicks and penalty enforcement are not modeled. See the [2026 NFL rulebook](https://operations.nfl.com/rules-officiating/2026-nfl-rulebook) and [NFL explanation of 35-yard touchbacks](https://www.nfl.com/_amp/nfl-owners-vote-to-make-dynamic-kickoff-permanent-adjust-ball-spot-on-touchbacks-to-35-yard-line).

Punts have a long snap, protection, gunners, jammers, hang time and return coverage. Return distance comes from the moving carrier and tackle, not a preselected return-yard roll. Fair catches, downed punts, touchbacks and blocked punts produce corresponding possession spots. Blocked-punt recovery is simplified to receiving-team possession.

Placekicks have an eight-yard holder depth, matching 33-yard extra points from the 15. The accuracy model generates the flight; scoring checks the goal plane, crossbar height and upright width. Short and wide misses are distinct, and an unblocked miss gives the receiving team the kick spot or its own 20, whichever is farther from its goal. Blocked-field-goal recovery uses that same simplified placement. Extra points do not consume game-clock time. Kickoffs consume game-clock time after the catch.
