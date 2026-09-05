CREATE TABLE IF NOT EXISTS cloud_saves (
  token_hash TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  save_json TEXT NOT NULL,
  last_request TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
