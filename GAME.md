# Draw the Play — mobile web game

## Play the game

1. Open Home, then **Build your starting lineup**. Existing purchases are preserved.
2. In Roster, **Fill essentials** signs affordable players for the 25 required roles. Or recruit manually from Player market.
3. Open **Playbook**. Start with four plays, create one, select a player and drag on the field, or choose a route preset. Set the primary target and save.
4. In **GM**, move players up the depth chart and set your franchise name/color.
5. In **Play**, choose an NFL opponent and kick off. Choose saved offensive plays, defensive coverages, punts, field goals, PAT or two-point tries. Four 2-minute quarters end in a result, with ties allowed.
6. Home shows your record and recent games. A completed game gives one scouting token, or two for a win. Each game rewards only once, including after reload.

## What is integrated

The original project's pure TypeScript seeded RNG, field-coordinate model, downs/distance, scoring, kicking and turnover rules were copied into `src/engine/`. A new local practice controller adds clock progression, quarter transitions, halftime kickoffs, timeouts, offense/defense calls, and game completion.

Your purchased NFL roster is snapshotted when a game starts. GM depth order chooses offensive starters and defensive units. Ratings affect blocking/protection, receiving, quarterback outcomes, rushing, coverage and kicking. New GM changes apply to the next game.

Saved route depth and lateral displacement affect pass completion and yardage against coverage. Run calls use RB routes and authored blocking assignments. This is a **simplified local practice model**, not the fully calibrated route-by-route/tick-by-tick simulation described in the native redesign PRD. Field animation is a schematic of the selected route, not an authoritative 22-player replay. Ties are permitted; overtime, penalties and injuries are not simulated. Original special-teams assumptions were retained; this is not a claim of current official NFL rules fidelity.

## Screens

- **Home:** franchise, readiness, resume game, record and recent games.
- **Roster / Player market / Scouting packs:** connected player profiles, recruitment, refunds and unlocks.
- **Playbook:** three formations, touch/pointer drawing, keyboard-selectable route presets, primary targets, undo, save and confirmed deletion.
- **Play:** saved practice game vs a real NFL team roster, per-snap calls, scoreboard, log and result.
- **GM:** team name/color, budget, positional depth chart and starter ordering.

## Persistence and scope

One browser-local franchise save now contains roster, unlocks, custom plays, depth chart, team identity, in-progress game and history. JSON export/import covers these together. Old roster-only saves receive a default playbook. Reset confirmation clears the full franchise.

Online multiplayer, real payments, advanced GM contracts/trades/injury workflows, and the native app's AI media services are not connected. No placeholder multiplayer button is presented as working.

## Validation

Build with `npm run build`. Run `npm test` for economy, profile, route, seeded simulation, save migration, depth ordering, halftime/PAT, timeout and reward tests, including a 100-game completion harness. All 19 tests pass, including server-side component rendering and a 100-game completion harness. Visual browser checks remain dependent on permission for the local browser preview.

## Field-first play update

Once a game starts, Play takes over the viewport. The roster/budget dashboard and app navigation no longer compete with the field. A compact scoreboard sits above it and a bottom control tray supplies Plays, Draw, Defense, Snap and More. Exit returns to Home with the game saved.

- **Plays:** 30 library calls across Shotgun, Singleback and Trips, plus your own saved plays. Search/filter or start a blank on-field call.
- **Draw:** tap a numbered offensive token, close its assignment tray, and drag on the field. Route presets are available as an alternative to gestures.
- **QB:** tap the quarterback to select pass/run, reorder all five eligible receiver reads, or choose an RB handoff / QB keeper.
- **Line:** draw toward the defense for a run block and toward your own end zone for pass protection. Assignment buttons do the same without drawing.
- **Defense:** select Cover 2, Cover 3, Man or Blitz. Alignment and behavior change, not just the label.
- **Animation:** the new scrimmage resolver advances 22 entities at 20 ticks/second. Routes, blocking direction/engagement, coverage, pressure, sequential read checks, throwing, catching and pursuit produce both the replay frames and the yardage result. The browser interpolates those frames while the scoreboard holds the pre-snap state, then advances the line of scrimmage.
- **Persistence:** in-huddle routes/read order/coverage are saved. Only the most recent replay stores frames, keeping the play log small. Reload during animation resumes at the resolved next snap.

The model uses estimated skills and historical combine speed where available. It is not calibrated to NFL outcome distributions, does not yet model full penalties/injuries/fatigue, and special-teams animation remains a simpler ball-flight presentation of the existing kicking rules. Full browser visual/touch checks remain unverified because browser access was previously denied.

Validation: 24 automated tests pass, including all-player motion, finite coordinates, ball-carrier yardage agreement, ordered reads, blocking direction, keeper/handoff behavior, repeatability, and 100 full games.

### Team identity and field scale
NFL palettes come from nflverse teams_colors_logos.csv. Team colors persist across possession changes and color the corresponding end zones; custom franchises retain their chosen accent. Offense uses circles and defense uses squares throughout gameplay and playbook diagrams. Tokens are scaled to 1.36 yards across, with separate lines across the neutral zone, tighter offensive line splits and formation-specific backfield depth.

### Simulation version 2
The core execution model has been replaced with persistent blocking engagements, acceleration and contact, delayed man/zone reactions, developed routes and timed QB decisions, physical catches, run-lane evaluation and pursuit. Markers now have equal filled area. Pause, speed controls, replay, visible blocking links and player inspection are available on the field. See SIMULATION.md for the model, validation commands, data provenance and remaining simplifications. This supersedes the earlier token-size description: circle radius is now 0.74 field yards and square area matches it.

### 53-man roster and special teams
Roster capacity is now 53 with an affordable full-roster fill option and a 100,000-credit starting budget. Old saves receive the 25,000-credit difference once. In-game Plays includes kickoff, punt, field goal and extra-point units and animations, replacing the generic kick flight. SIMULATION.md describes the rules represented and remaining special-teams simplifications.

### Persistent game stats and achievements
The Stats navigation page provides Career stats, Game history and Achievements. Finished games open their box score automatically; every completed game's team and individual records remain in the save. Player profiles include a separate franchise-stats section, and released players retain their career records. The stats page includes passing, rushing, receiving, defense, kicking/returns, participation and blocking categories, player search, sortable leaderboards, team comparisons and individual game logs.

Stats are accumulated from executed plays, with pass attempts excluding sacks, passing/receiving touchdowns credited separately to players but once to the team, rushing losses preserved, and third/fourth-down conversion attempts tracked. Career totals and rewards use completed games only. In-progress counters persist with the game; discarding a game discards its counters. Saved box scores omit replay frames to limit storage use.

There are 36 achievement tiers across touchdowns, passing/rushing yards and TDs, third-down conversions, first downs, sacks, interceptions, field goals, return yards and wins. Rewards add credits automatically on first unlock at game completion. Each game records its newly earned achievements and payout; finalization is idempotent. Export/import preserves stats and rewards. Records are local to this browser/save, not cloud-synced.

Older games without box scores remain score-only. A game underway when tracking was added is marked partial. Imported NFL season statistics remain separate from these simulated franchise records. Two-point tries currently use the existing simplified resolver and do not produce individual player stats.
