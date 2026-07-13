-- =============================================================================
-- 003_octavos_y_adelante.sql
-- Octavos de Final, Cuartos, Semifinales, Tercer Puesto y Final
-- All times in UTC (Argentina Time ART = UTC-3)
-- e.g. 4:00 PM ART = 19:00 UTC, 9:00 PM ART = 00:00 UTC next day
-- Uses ON CONFLICT DO UPDATE (upsert) — safe to re-run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Octavos de Final (R8) — 8 matches
-- ---------------------------------------------------------------------------
INSERT INTO matches (id, home_team, away_team, date, "group", home_score, away_score, status, stadium) VALUES
  -- Finished
  ('M89', 'py',     'fr',     '2026-07-04T19:00:00.000Z', 'R8', 0,    1,    'finished',  'TBD'),
  ('M90', 'ca',     'ma',     '2026-07-04T23:00:00.000Z', 'R8', 0,    3,    'finished',  'TBD'),
  ('M91', 'br',     'no',     '2026-07-05T20:00:00.000Z', 'R8', 1,    2,    'finished',  'TBD'),
  -- No predictions (today / already started) — 9:00 PM ART = 00:00 UTC Jul 6
  ('M92', 'mx',     'gb-eng', '2026-07-06T00:00:00.000Z', 'R8', NULL, NULL, 'scheduled', 'TBD'),
  -- Predictable from tomorrow
  ('M93', 'pt',     'es',     '2026-07-06T19:00:00.000Z', 'R8', NULL, NULL, 'scheduled', 'TBD'),
  ('M94', 'us',     'be',     '2026-07-07T00:00:00.000Z', 'R8', NULL, NULL, 'scheduled', 'TBD'),
  ('M95', 'ar',     'eg',     '2026-07-07T16:00:00.000Z', 'R8', NULL, NULL, 'scheduled', 'TBD'),
  ('M96', 'ch',     'co',     '2026-07-07T20:00:00.000Z', 'R8', NULL, NULL, 'scheduled', 'TBD')
ON CONFLICT (id) DO UPDATE SET
  home_team  = EXCLUDED.home_team,
  away_team  = EXCLUDED.away_team,
  date       = EXCLUDED.date,
  "group"    = EXCLUDED."group",
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  status     = EXCLUDED.status,
  stadium    = EXCLUDED.stadium;

-- ---------------------------------------------------------------------------
-- Cuartos de Final (QF) — 4 matches
-- Francia vs Marruecos confirmed; remaining TBD pending R8 results
-- ---------------------------------------------------------------------------
INSERT INTO matches (id, home_team, away_team, date, "group", home_score, away_score, status, stadium) VALUES
  ('M97',  'fr',  'ma',  '2026-07-09T20:00:00.000Z', 'QF', NULL, NULL, 'scheduled', 'TBD'),
  ('M98',  'tbd', 'tbd', '2026-07-10T19:00:00.000Z', 'QF', NULL, NULL, 'scheduled', 'TBD'),
  ('M99',  'no',  'tbd', '2026-07-11T21:00:00.000Z', 'QF', NULL, NULL, 'scheduled', 'TBD'),
  ('M100', 'tbd', 'tbd', '2026-07-12T01:00:00.000Z', 'QF', NULL, NULL, 'scheduled', 'TBD')
ON CONFLICT (id) DO UPDATE SET
  home_team  = EXCLUDED.home_team,
  away_team  = EXCLUDED.away_team,
  date       = EXCLUDED.date,
  "group"    = EXCLUDED."group",
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  status     = EXCLUDED.status,
  stadium    = EXCLUDED.stadium;

-- ---------------------------------------------------------------------------
-- Semifinales (SF) — 2 matches
-- ---------------------------------------------------------------------------
INSERT INTO matches (id, home_team, away_team, date, "group", home_score, away_score, status, stadium) VALUES
  ('M101', 'ar', 'gb-eng', '2026-07-14T19:00:00.000Z', 'SF', NULL, NULL, 'scheduled', 'TBD'),
  ('M102', 'es', 'fr', '2026-07-15T19:00:00.000Z', 'SF', NULL, NULL, 'scheduled', 'TBD')
ON CONFLICT (id) DO UPDATE SET
  home_team  = EXCLUDED.home_team,
  away_team  = EXCLUDED.away_team,
  date       = EXCLUDED.date,
  "group"    = EXCLUDED."group",
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  status     = EXCLUDED.status,
  stadium    = EXCLUDED.stadium;

-- ---------------------------------------------------------------------------
-- Tercer Puesto (3P) — 1 match
-- ---------------------------------------------------------------------------
INSERT INTO matches (id, home_team, away_team, date, "group", home_score, away_score, status, stadium) VALUES
  ('M103', 'tbd', 'tbd', '2026-07-18T21:00:00.000Z', '3P', NULL, NULL, 'scheduled', 'TBD')
ON CONFLICT (id) DO UPDATE SET
  home_team  = EXCLUDED.home_team,
  away_team  = EXCLUDED.away_team,
  date       = EXCLUDED.date,
  "group"    = EXCLUDED."group",
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  status     = EXCLUDED.status,
  stadium    = EXCLUDED.stadium;

-- ---------------------------------------------------------------------------
-- Final (FIN) — 1 match — MetLife Stadium, Jul 19
-- ---------------------------------------------------------------------------
INSERT INTO matches (id, home_team, away_team, date, "group", home_score, away_score, status, stadium) VALUES
  ('M104', 'tbd', 'tbd', '2026-07-19T19:00:00.000Z', 'FIN', NULL, NULL, 'scheduled', 'MetLife Stadium, NY/NJ')
ON CONFLICT (id) DO UPDATE SET
  home_team  = EXCLUDED.home_team,
  away_team  = EXCLUDED.away_team,
  date       = EXCLUDED.date,
  "group"    = EXCLUDED."group",
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  status     = EXCLUDED.status,
  stadium    = EXCLUDED.stadium;
