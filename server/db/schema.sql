PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS goals (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  exam_date           TEXT NOT NULL,
  start_date          TEXT NOT NULL,
  total_target_hours  REAL NOT NULL CHECK (total_target_hours >= 0),
  max_daily_hours     REAL NOT NULL DEFAULT 6 CHECK (max_daily_hours > 0),
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id               INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  weight_pct            REAL NOT NULL CHECK (weight_pct >= 0 AND weight_pct <= 100),
  target_hours_override REAL,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_subjects_goal_id ON subjects(goal_id);

CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id    INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  session_date  TEXT NOT NULL,
  minutes       INTEGER NOT NULL CHECK (minutes > 0),
  focus_rating  INTEGER CHECK (focus_rating IS NULL OR (focus_rating BETWEEN 1 AND 5)),
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_subject_date ON sessions(subject_id, session_date);

-- Global weekly availability template, shared across all goals.
CREATE TABLE IF NOT EXISTS availability (
  weekday          INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  available_hours  REAL NOT NULL DEFAULT 0 CHECK (available_hours >= 0)
);

-- Global blackout dates, shared across all goals.
CREATE TABLE IF NOT EXISTS blackout_dates (
  date    TEXT PRIMARY KEY,
  reason  TEXT
);

-- Global sticky-note corkboard, shared across all goals.
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  content     TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow','pink','green','blue','orange','purple')),
  pos_x       REAL NOT NULL DEFAULT 0,
  pos_y       REAL NOT NULL DEFAULT 0,
  rotation    REAL NOT NULL DEFAULT 0 CHECK (rotation BETWEEN -15 AND 15),
  z_index     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_z_index ON notes(z_index);

-- Keys used: 'active_goal_id', 'weights_verified'
CREATE TABLE IF NOT EXISTS meta (
  key    TEXT PRIMARY KEY,
  value  TEXT
);
