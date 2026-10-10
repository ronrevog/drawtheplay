# Game push notifications

Standard Web Push, using Firebase-authenticated accounts and Cloudflare storage/execution. No FCM service-account credential, SMS provider, or per-message vendor charge. Hosting quotas apply.

Players opt in from their profile screen, per device. Four preferences: invitations, turns, final results, NEFL week/season changes. iPhone/iPad require a supported Home Screen installation. The manifest and push-only service worker do not cache game pages or saves. Sign-out unsubscribes the local device. Payload text is generic; clicking opens an authenticated match/league URL.

PUSH_PUBLIC_KEY and PUSH_PRIVATE_KEY are Worker secrets. Do not regenerate them during ordinary deployment: subscriptions are tied to the public key. The public key is intentionally returned only by the signed-in configuration API. Existing Firebase phone sign-in remains unchanged.

pc_push stores device subscriptions/preferences; pc_push_outbox stores event payloads. Unique event IDs deduplicate inserts. A minute cron dispatches delivery to a Durable Object (avoids the small free Worker CPU budget for encryption). Delivery claims up to five events per tick, retries failures up to five attempts, removes expired endpoints (404/410), and expires queued events after 24 hours. Notifications may be delayed/dropped by browser settings, OS power policy, provider errors or exhausted quota. Event enqueue follows game commit; a database failure at that boundary can lose an alert but never rolls back the game. A failed device can cause another device to receive a retry; stable notification tags replace the previous alert.

Subscription API validates HTTPS provider hostnames, bounded endpoint/key formats, authenticated ownership and a ten-device cap. Current supported endpoint hosts: fcm.googleapis.com, web.push.apple.com, updates.push.services.mozilla.com. Additional browser push providers require an explicit allowlist update.

Tests use synthetic subscriptions/keys and a stub push provider inside native workerd/D1. They verify encrypted payload construction, cross-account isolation, preferences and opt-out; no real user notifications are sent. Physical phone delivery requires a player opting in on that device.
