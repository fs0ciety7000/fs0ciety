-- ╔══════════════════════════════════════════════════════════════╗
-- ║  fs0ciety — SurrealDB Schema v002                          ║
-- ║  Add profile fields: bio, avatar_url, profile_public       ║
-- ╚══════════════════════════════════════════════════════════════╝

DEFINE FIELD IF NOT EXISTS bio            ON TABLE users TYPE option<string>;
DEFINE FIELD IF NOT EXISTS avatar_url     ON TABLE users TYPE option<string>;
DEFINE FIELD IF NOT EXISTS profile_public ON TABLE users TYPE bool DEFAULT true;
