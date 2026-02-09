-- ╔══════════════════════════════════════════════════════════════╗
-- ║  fs0ciety — SurrealDB Schema v001                          ║
-- ║  Tables: users, posts, seedbox_metrics                     ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Users ───────────────────────────────────────────────────────
-- Role-based access: admin (dashboard + blog), guest (blog only)

DEFINE TABLE IF NOT EXISTS users SCHEMAFULL;

DEFINE FIELD IF NOT EXISTS username      ON TABLE users TYPE string  ASSERT string::len($value) >= 3;
DEFINE FIELD IF NOT EXISTS password_hash ON TABLE users TYPE string;
DEFINE FIELD IF NOT EXISTS role          ON TABLE users TYPE string  ASSERT $value IN ["admin", "guest"];
DEFINE FIELD IF NOT EXISTS email         ON TABLE users TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at    ON TABLE users TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated_at    ON TABLE users TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS last_login    ON TABLE users TYPE option<datetime>;

DEFINE INDEX IF NOT EXISTS idx_users_username ON TABLE users COLUMNS username UNIQUE;
DEFINE INDEX IF NOT EXISTS idx_users_email    ON TABLE users COLUMNS email    UNIQUE;

-- ── Posts ───────────────────────────────────────────────────────
-- Blog posts with MDX content, tagging, and publish control.

DEFINE TABLE IF NOT EXISTS posts SCHEMAFULL;

DEFINE FIELD IF NOT EXISTS title      ON TABLE posts TYPE string  ASSERT string::len($value) >= 1;
DEFINE FIELD IF NOT EXISTS slug       ON TABLE posts TYPE string  ASSERT string::len($value) >= 1;
DEFINE FIELD IF NOT EXISTS content    ON TABLE posts TYPE string;
DEFINE FIELD IF NOT EXISTS tags       ON TABLE posts TYPE array;
DEFINE FIELD IF NOT EXISTS tags.*     ON TABLE posts TYPE string;
DEFINE FIELD IF NOT EXISTS published  ON TABLE posts TYPE bool    DEFAULT false;
DEFINE FIELD IF NOT EXISTS author     ON TABLE posts TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE posts TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE posts TYPE datetime DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS idx_posts_slug ON TABLE posts COLUMNS slug UNIQUE;

-- ── Seedbox Metrics ────────────────────────────────────────────
-- Historical snapshots of download/upload speeds, disk usage.

DEFINE TABLE IF NOT EXISTS seedbox_metrics SCHEMAFULL;

DEFINE FIELD IF NOT EXISTS download_speed    ON TABLE seedbox_metrics TYPE int;
DEFINE FIELD IF NOT EXISTS upload_speed      ON TABLE seedbox_metrics TYPE int;
DEFINE FIELD IF NOT EXISTS disk_used         ON TABLE seedbox_metrics TYPE int;
DEFINE FIELD IF NOT EXISTS disk_total        ON TABLE seedbox_metrics TYPE int;
DEFINE FIELD IF NOT EXISTS active_torrents   ON TABLE seedbox_metrics TYPE int;
DEFINE FIELD IF NOT EXISTS seeding_torrents  ON TABLE seedbox_metrics TYPE int;
DEFINE FIELD IF NOT EXISTS timestamp         ON TABLE seedbox_metrics TYPE datetime DEFAULT time::now();

-- Index for time-series queries (recent metrics).
DEFINE INDEX IF NOT EXISTS idx_metrics_ts ON TABLE seedbox_metrics COLUMNS timestamp;
