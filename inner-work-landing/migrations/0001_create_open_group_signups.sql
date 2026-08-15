CREATE TABLE open_group_signups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL,
  session_date TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'expired')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  expires_at   TEXT NOT NULL
);

CREATE INDEX idx_signups_token ON open_group_signups(token);

-- One active (pending or confirmed) signup per email per session.
-- This is the real anti-duplicate boundary, not the UI.
CREATE UNIQUE INDEX idx_signups_active_email_session
  ON open_group_signups(email, session_date)
  WHERE status IN ('pending', 'confirmed');
