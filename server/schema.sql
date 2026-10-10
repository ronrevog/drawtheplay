CREATE TABLE IF NOT EXISTS mp_players (
 uid TEXT PRIMARY KEY, handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
 name TEXT NOT NULL, phone_hash TEXT NOT NULL, discoverable INTEGER NOT NULL DEFAULT 1,
 updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mp_phone ON mp_players(phone_hash);
CREATE TABLE IF NOT EXISTS mp_matches (
 id TEXT PRIMARY KEY, host TEXT NOT NULL, guest TEXT, target_uid TEXT, target_hash TEXT,
 status TEXT NOT NULL, revision INTEGER NOT NULL, doc TEXT NOT NULL,
 created INTEGER NOT NULL, updated INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mp_host ON mp_matches(host,updated);
CREATE INDEX IF NOT EXISTS mp_guest ON mp_matches(guest,updated);
CREATE INDEX IF NOT EXISTS mp_target ON mp_matches(target_uid,status);
CREATE INDEX IF NOT EXISTS mp_target_phone ON mp_matches(target_hash,status);
CREATE TABLE IF NOT EXISTS mp_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);

CREATE INDEX IF NOT EXISTS mp_limit_expiry ON mp_limits(expires);

CREATE TABLE IF NOT EXISTS pc_franchises (uid TEXT PRIMARY KEY, revision INTEGER NOT NULL, doc TEXT NOT NULL, previous_doc TEXT, updated INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS nefl_leagues (id TEXT PRIMARY KEY, owner TEXT NOT NULL, revision INTEGER NOT NULL, doc TEXT NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS pc_push (id TEXT PRIMARY KEY,uid TEXT NOT NULL,subscription TEXT NOT NULL,preferences TEXT NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS pc_push_uid ON pc_push(uid);
CREATE TABLE IF NOT EXISTS pc_push_outbox (id TEXT PRIMARY KEY,uid TEXT NOT NULL,type TEXT NOT NULL,payload TEXT NOT NULL,created INTEGER NOT NULL,next_try INTEGER NOT NULL,attempts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS pc_push_due ON pc_push_outbox(next_try);

CREATE TABLE IF NOT EXISTS pc_notice_reads (uid TEXT NOT NULL,notice_id TEXT NOT NULL,read_at INTEGER NOT NULL,PRIMARY KEY(uid,notice_id));
