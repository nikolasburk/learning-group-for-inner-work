CREATE TABLE closed_group_applications (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  why_now          TEXT NOT NULL,
  commitment       TEXT NOT NULL,
  anything_else    TEXT,
  cycle_start_date TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_applications_email_cycle
  ON closed_group_applications(email, cycle_start_date);
