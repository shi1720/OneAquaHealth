-- Existing accounts can create a key after confirming their current password.
-- Only a domain-separated SHA-256 digest of a 256-bit random secret is stored.
CREATE TABLE IF NOT EXISTS recovery_keys (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
