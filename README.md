# Draw the Play — Mobile Web Game

A React mobile web football game connected to nflverse. Home, Playbook, local practice, GM and roster management are integrated. See [GAME.md](GAME.md) for the play loop and current scope. The native iPhone project remains unchanged.

## Run

```sh
npm ci
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173. `npm run build` produces a static site in `dist/`. `npm test` checks the catalog, roster economy, simulation, special teams, persistent statistics, achievements, and screen rendering.

## Implemented

- All 2,997 identified player records retained, including reserve/cut/practice statuses.
- 1,735 recruitable players across 32 NFL teams (ACT + INA); 1,728 supplied headshot URLs with number fallback.
- 347 starter-market players: 20% of recruitable players, all at or below 80 overall, sampled deterministically across positions.
- Search, position/team filters, sorting, player profiles, statistical context, and estimated ratings.
- 100,000 starting credits, 53 roster slots, 25 required lineup positions, and atomic auto-fill for essentials or a full 53-man squad. Existing saves receive the 25,000-credit increase once.
- Recruitment, duplicate protection, full original-price release refunds, and saved purchase receipts.
- 5 initial scouting tokens. Earn 2 at roster sizes 10, 20, 30, 40 and 53 once each. Three pack tiers with equal per-player chances within each eligible pool and no duplicate unlocks. Packs unlock recruitment rights, not free roster places. No payments.
- Browser-local saves, JSON backup import/export, and confirmed reset. Storage failures are surfaced. No cross-device sync or accounts.
- Responsive cards, bottom navigation, keyboard focus handling, reduced-motion support, and touch-sized primary controls.

## Gameplay and franchise

- Draw routes, set quarterback read order, and call plays from a saved playbook.
- Live offense and defense simulation, directional line blocking, and whole-line pass protection.
- Kickoffs, punts, field goals, extra points, and returns.
- Field-side controls, four camera views with panning, and playback controls. On narrow portrait screens the field workspace scrolls horizontally to keep panels beside the field.
- Player box scores, career totals, game history, achievements, and credit rewards.
- Custom primary, secondary, and tertiary franchise colors.

## Ratings and pricing

`public/data/catalog.json` is generated from 2026 rosters and latest depth charts, plus 2025/2026 regular-season stats. Each position receives a production score suited to that position (e.g. passing for QBs, yards/touchdowns for skill positions, defensive counting stats, kicking accuracy, punting net yards). Per-game production percentiles are mapped to 60–98 then blended with depth-chart role, with low samples receiving less statistical weight. Prior-season games receive a 0.6 weight; current games receive 1.0.

OL/LS ratings are explicitly **role estimates** because the loaded feeds lack individual blocking/long-snapping performance grades. Defensive counting stats also have limitations; these are game estimates, not official NFL grades. Production, Role and Experience are displayed as estimates, not measured speed/strength attributes. The simulation derives estimated physical and technical attributes from these ratings, roster measurements, and historical combine data where available.

Base price: `1000 × 2^((overall − 60)/10)`, multiplied by position (QB 1.35, OL/DL 1.1, K 0.7, P 0.65, LS 0.5, others 1), rounded to 50 credits. The current rating range is 60–93. Models and defaults are versioned proposals for playtesting.

## Refresh data

```sh
npm run data:refresh
```

Uses Python's standard library and downloads source CSVs into ignored `cache/2026/`. This is a manual refresh, not a scheduled service. Old purchases retain their paid amount. Existing owned IDs remain in the save while present in the catalog; changed market eligibility does not remove signed players.

Sources:
- [nflverse roster releases](https://github.com/nflverse/nflverse-data/releases/tag/rosters)
- [nflverse statistics](https://github.com/nflverse/nflverse-data/releases/tag/stats_player)
- [nflverse depth charts](https://github.com/nflverse/nflverse-data/releases/tag/depth_charts)

The generated catalog records URLs, import time, and the depth snapshot. Two source rows without GSIS IDs are excluded and counted. The dataset's external headshot URLs are used directly; no images were downloaded. Missing/failed images fall back to jersey numbers. Google Fonts are optional; system fonts are the fallback.

## Verification and limits

Production build and the automated data/economy/game tests pass. UI browser verification was blocked by a browser-permission denial, so responsive rendering and interactive UI flows have not been visually verified. This is local-only personal software; the client-side economy is not appropriate for real-money purchases or competitive server-authoritative multiplayer.

## Expanded player profiles

Profiles now include roster height/weight, age as of catalog import, college, birth date, experience, entry year, draft pick/team, roster status, and historical combine testing. Combine rows are joined on exact PFR player IDs; missing measurements remain null. The 40-yard dash is measured historical sprint time, not a current speed rating. Bench press, vertical/broad jumps, 3-cone, and shuttle are shown where available.

2025/2026 position-specific statistics and derived efficiency metrics retain zero values and distinguish unavailable fields. Offensive-line blocking grades and long-snap accuracy remain unavailable rather than fabricated. The automated suite covers data, economy, profiles, gameplay, and persistence.

## Special edition packs

The Scouting packs page includes eight choose-one-of-three player collections, priced at 18–30 scouting tokens before duplicate discounts. Each collection can be opened once per franchise. Already signed, unlocked or starter-market players reduce the price proportionally, rounded up to a whole token. Empty or incomplete lineups cannot be purchased. Choose one locked player before purchase and confirm the choice. Only the selected player receives signing rights; the other two remain as they were. The choice cannot be changed or repeated after save/reload. Players still cost credits to recruit. Existing purchases and unlocks from the earlier three-player version are preserved. Featured reserve players receive special-edition eligibility without changing their catalog roster status.

Stat-based selections use the bundled 2025 regular-season totals; ties break by overall rating, name and player ID. Rating collections use the catalog ratings (OL ratings are role estimates). MVP Royalty uses 2025 Matthew Stafford, 2024 Josh Allen and 2023 Lamar Jackson, verified against NFL.com award announcements (sources in src/premiumPacks.js). The edition remains fixed rather than silently switching to partial 2026 statistics.

Receipts and special signing rights persist in local saves and JSON backups. Legacy saves start with empty special-pack records. Native-generated cover originals live in public/packs; generation prompts are recorded in scripts/pack-cover-prompts.json. The native image tool does not expose its model version.


### Team identities and helmet graphics
The GM office includes 20 original fictional team presets and 32 pro color presets. Selecting a preset locks its name and three-color palette. The custom tab restores the previous custom name and colors. Identity choices do not change the player roster. Newly started games snapshot the identity and colors.

Original teams: Wildcats, Sabers, Orcas, Knights, Reds, Thunderbirds, Copperheads, Glaciers, Outlaws, Sentinels, Stingrays, Bison, Firebirds, Ironclads, Jackals, Redwoods, Comets, Krakens, Roadrunners, Monarchs.

`src/teamIdentities.js` defines the palettes. `public/helmets/teams.json` is the asset manifest. `public/helmets/<identity>.png` contains native image-generator artwork using the supplied F7 helmet as the geometry reference. Fictional helmets have original mascot decals; pro helmets use team colors on blank sides without team or league logos. They are color-based game designs, not claims of exact current uniform replicas. The generation prompts are saved in `scripts/helmet-prompts.json`; `scripts/prepare-helmets.mjs` rebuilds the prompt and palette manifests without generating images.

| Original team | Primary | Secondary | Accent |
| --- | --- | --- | --- |
| Wildcats | #F47321 | #005030 | #FFFFFF |
| Sabers | #142840 | #E4B74C | #E9EEF4 |
| Orcas | #071E2A | #22BED0 | #FFFFFF |
| Knights | #242831 | #B9C3CF | #D9AE56 |
| Reds | #C62832 | #FFF0D4 | #22252B |
| Thunderbirds | #472C85 | #F5C64F | #E7EAF1 |
| Copperheads | #B66B3F | #102E2A | #F3E4C9 |
| Glaciers | #9DDCF2 | #17395F | #FFFFFF |
| Outlaws | #272329 | #C44B38 | #D8C8AB |
| Sentinels | #2344A5 | #D1D9E3 | #F06D35 |
| Stingrays | #007F82 | #EC5C83 | #E8F5F3 |
| Bison | #624633 | #D6A64F | #F5E8CC |
| Firebirds | #9C263B | #FF9C35 | #F8DD8D |
| Ironclads | #414B59 | #36B7B0 | #D5DBDF |
| Jackals | #BE9B59 | #25203D | #F1E6CD |
| Redwoods | #194A3B | #BB633D | #F0DFBC |
| Comets | #342A75 | #FF7045 | #D6EBFF |
| Krakens | #38274A | #24A5A1 | #D9C5F1 |
| Roadrunners | #D45B2A | #25495E | #F7DEAD |
| Monarchs | #652C70 | #E1B950 | #F1E5D5 |
