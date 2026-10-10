# NEFL

National Electronic Football League uses the 20 FICTIONAL_TEAMS only. Each team plays its nine conference opponents plus one cross-conference opponent: 10 games, five home and five away, no byes/repeats. Top four per conference advance through conference semifinals, conference finals, and the NEFL championship. Tiebreakers are wins + half ties, point differential, points scored, then stable team ID. Playoff ties extend into repeat two-minute overtime periods.

Solo leagues start immediately. Private online leagues begin in a lobby; a bearer invitation code permits signed-in coaches to claim an unoccupied custom team. Only members can read league details; only the commissioner starts/advances. Unclaimed teams are CPU controlled. Rosters/depth are snapshotted from the built franchise, validated against canonical player data, and fixed for the season. Existing client ownership trust is unchanged (purchases are not server-authoritative).

Human fixtures use existing authoritative multiplayer matches, call privacy, replay and revision checks. CPU opponents submit a call automatically. CPU-only fixtures use deterministic quick score simulation rather than the snap engine and are labeled Simulated. Commissioner advances only after all coached fixtures finish. Forfeits are recorded as 1–0. Seasons remain available after the championship; create a new league to start another run. Trades, draft, injuries, cross-season progression and league stat leaderboards are not part of this initial release.

Storage: additive nefl_leagues table in server/schema.sql. Existing accounts and saves are unchanged. League/game revisions protect concurrent changes; fixture IDs make match creation idempotent. League creation is limited to five per account per day. No automatic SMS or new paid services.

Validation: schedule/bracket/overtime unit tests; native Worker/D1 synthetic private-lobby, claimed-team, authorization, two-human calls, CPU full game, resume and full-season-to-champion checks. Desktop and 390px isolated UI preview checked. Real simultaneous devices and real phone login were not used in these tests.
