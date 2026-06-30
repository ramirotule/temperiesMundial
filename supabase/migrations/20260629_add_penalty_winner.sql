-- Additive migration: add penalty_winner column to matches and predictions
-- No DEFAULT; nullable only. No existing columns are altered or dropped.

ALTER TABLE matches
  ADD COLUMN penalty_winner TEXT CHECK (penalty_winner IN ('home', 'away'));

ALTER TABLE predictions
  ADD COLUMN penalty_winner TEXT CHECK (penalty_winner IN ('home', 'away'));
