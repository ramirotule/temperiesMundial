-- =============================================================================
-- 002_knockout_matches.sql
-- Round of 16 knockout stage matches for World Cup 2026
-- =============================================================================

INSERT INTO matches (id, home_team, away_team, date, "group", home_score, away_score, status, stadium) VALUES
  -- Domingo 28 de junio
  ('M73', 'ca', 'za', '2026-06-28T19:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),

  -- Lunes 29 de junio
  ('M74', 'br', 'jp', '2026-06-29T17:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M75', 'de', 'py', '2026-06-29T20:30:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M76', 'nl', 'ma', '2026-06-30T01:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),

  -- Martes 30 de junio
  ('M77', 'ci', 'no', '2026-06-30T17:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M78', 'fr', 'se', '2026-06-30T21:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M79', 'mx', 'ec', '2026-07-01T01:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),

  -- Miercoles 1 de julio
  ('M80', 'gb-eng', 'cd', '2026-07-01T16:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M81', 'be', 'sn', '2026-07-01T20:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M82', 'us', 'ba', '2026-07-02T00:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),

  -- Jueves 2 de julio
  ('M83', 'es', 'at', '2026-07-02T19:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M84', 'pt', 'hr', '2026-07-02T23:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),

  -- Viernes 3 de julio
  ('M85', 'ch', 'dz', '2026-07-03T03:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M86', 'au', 'eg', '2026-07-03T18:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M87', 'ar', 'cv', '2026-07-03T22:00:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD'),
  ('M88', 'co', 'gh', '2026-07-04T01:30:00.000Z', 'R16', NULL, NULL, 'scheduled', 'TBD');
