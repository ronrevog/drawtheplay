# Friends multiplayer

Sign in, open Friends, and create a player name. Search opted-in usernames or enter a US phone number. Phone challenges are bound to that verified phone account, not whoever receives the URL. Creating an invitation sends no SMS. Send text opens the device messaging app for the player to send; carrier charges may apply.

Each player uses their built franchise roster, depth chart, name, helmet and colors. There is no team picker. The host roster is frozen when inviting; the guest roster is frozen when accepting. Later local roster edits do not change existing matches. Server canonical data supplies ratings for every submitted player ID, including legends. Local roster ownership is client-authoritative, so this is friendly multiplayer, not a server-verified competitive economy. Both coaches lock one call per play; the server resolves the simulation after both arrive. Offense can draw routes or select plays, defense chooses coverage. Calls cannot be changed once locked. Refreshing or leaving preserves the match. Last play replays the most recent resolved play. Friends badges and the inbox update while the app is open; there is no background push notification service.

## Hosting and authentication

Cloudflare SQLite Durable Objects execute the API and simulation, with D1 storing profiles, invitations, calls and games. Ordinary Workers Free CPU limits are unsuitable for full simulation; Durable Objects have a 30-second default CPU allowance per invocation and are available on Free with SQLite. No plan upgrade is required by this implementation. Hosting quotas still apply; existing Firebase phone authentication can incur SMS verification charges. This change does not make authentication SMS free.

Firebase ID tokens are verified server-side against the project issuer, audience and Google keys. No production test-login bypass exists. Phone lookup uses HMAC with MP_PHONE_KEY; raw phone targets are not persisted or returned. Only opted-in usernames and display names appear in search. Changing MP_PHONE_KEY invalidates outstanding phone-target matches. Keep it stable and secret.

D1 revisions prevent duplicate resolution and stale updates; the client retries a stale lock only if the same turn is still open. Pending invites expire in seven days. Rate limits cap requests and invitations; at most ten hosted active/pending challenges per player. No subscription or messaging provider is configured.

## Development and deployment

Run npm run dev and npm run dev:api. Initialize local D1 with server/schema.sql and provide MP_PHONE_KEY in an ignored .dev.vars file. Use genuine Firebase sign-in for normal development. Never deploy synthetic test entry points. Production requires MP_DB, MP_ROOMS and MP_PHONE_KEY bindings from wrangler.jsonc / Wrangler secrets. Apply server/schema.sql idempotently before deploying. npm run deploy builds the client and publishes the Worker. The mp-v1 migration creates only the new SQLite Durable Object class.

## Verification, 2026-10-10

npm test: 130/130 passed. npm run test:multiplayer: 11 native workerd/Durable Object/D1 checks passed using synthetic identities in an in-memory bundle. Includes private phone invitations, opt-in search, simultaneous calls, stale revisions, replay access, body bounds, expiration, forfeits and a complete two-coach game. Two synthetic browser sessions also accepted a challenge, locked offense and defense calls and advanced the saved match. These results are not evidence of real-device SMS delivery, live two-person Firebase login, load capacity or background push delivery.

Published version: 0a9df5ba-2ef5-47f5-8537-882b81922551. Hosted HTML and client asset returned 200. Anonymous and malformed-token directory requests returned 401; an anonymous match request also returned 401. Mobile browser layout checked at 390 x 844; both submitted calls advanced the play and the saved replay displayed the incomplete-pass bounce. Physical touch devices and real two-user Firebase login remain unverified.
