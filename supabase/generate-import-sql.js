// generate-import-sql.js
// Usage: node generate-import-sql.js <backup.json> [output.sql]
// Generates a SQL migration from a backup JSON exported by the Express backend.

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const backupPath = process.argv[2];
const outputPath = process.argv[3] ?? 'supabase/migrations/002_import_data.sql';

if (!backupPath) {
  console.error('Usage: node generate-import-sql.js <backup.json> [output.sql]');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape single quotes in a string for safe SQL interpolation. */
function esc(str) {
  return String(str).replace(/'/g, "''");
}

/** Parse "ar vs dz" → { home: 'ar', away: 'dz' } — trims whitespace. */
function parsePartido(partido) {
  const parts = partido.split(' vs ');
  if (parts.length !== 2) throw new Error(`Cannot parse partido: "${partido}"`);
  return { home: parts[0].trim().toLowerCase(), away: parts[1].trim().toLowerCase() };
}

/** Parse "2 - 1" → { hs: 2, as_: 1 } — handles single-digit and multi-digit scores. */
function parseScore(scoreStr) {
  const parts = scoreStr.split(' - ');
  if (parts.length !== 2) throw new Error(`Cannot parse score: "${scoreStr}"`);
  const hs = parseInt(parts[0].trim(), 10);
  const as_ = parseInt(parts[1].trim(), 10);
  if (isNaN(hs) || isNaN(as_)) throw new Error(`Non-numeric score: "${scoreStr}"`);
  return { hs, as_ };
}

// ---------------------------------------------------------------------------
// Load backup
// ---------------------------------------------------------------------------
console.log(`Reading backup from: ${resolve(backupPath)}`);
const raw = readFileSync(backupPath, 'utf-8');
const backup = JSON.parse(raw);

const exportDate = backup.fecha_exportacion ?? 'unknown';
const pronosticos = backup.todos_los_pronosticos;

if (!Array.isArray(pronosticos)) {
  console.error('ERROR: backup.todos_los_pronosticos is not an array');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build empleado → username map from tabla_posiciones
// tabla_posiciones entries have both "empleado" (display) and "usuario" (username)
// ---------------------------------------------------------------------------
const empleadoToUsername = new Map();

if (Array.isArray(backup.tabla_posiciones)) {
  for (const row of backup.tabla_posiciones) {
    if (row.empleado && row.usuario) {
      empleadoToUsername.set(row.empleado, row.usuario);
    }
  }
  console.log(`Built empleado→username map: ${empleadoToUsername.size} entries`);
} else {
  console.warn('WARNING: backup.tabla_posiciones not found — username resolution will fall back to empleado field');
}

// ---------------------------------------------------------------------------
// Collect finished match results (deduped by partido key)
// ---------------------------------------------------------------------------
const matchResults = new Map(); // "home vs away" → { home, away, hs, as_ }
let skippedResults = 0;

for (const emp of pronosticos) {
  for (const p of emp.pronosticos ?? []) {
    if (p.estado === 'finished' && p.resultadoReal && p.resultadoReal !== 'Pendiente') {
      const key = p.partido;
      if (!matchResults.has(key)) {
        try {
          const { home, away } = parsePartido(p.partido);
          const { hs, as_ } = parseScore(p.resultadoReal);
          matchResults.set(key, { home, away, hs, as_ });
        } catch (e) {
          console.warn(`  Skipping match result — ${e.message}`);
          skippedResults++;
        }
      }
    }
  }
}

console.log(`Found ${matchResults.size} unique finished matches (${skippedResults} skipped)`);

// ---------------------------------------------------------------------------
// Collect predictions
// ---------------------------------------------------------------------------
const predictions = []; // { username, home, away, hs, as_ }
let skippedPreds = 0;
let missingUsername = 0;

for (const emp of pronosticos) {
  if (!Array.isArray(emp.pronosticos) || emp.pronosticos.length === 0) continue;

  // Resolve username: prefer tabla_posiciones map, fall back to emp.usuario,
  // then fall back to emp.empleado (risky but better than dropping the row).
  let username =
    empleadoToUsername.get(emp.empleado) ??
    emp.usuario ??
    null;

  if (!username) {
    console.warn(`  WARNING: no username for empleado "${emp.empleado}" — skipping their ${emp.pronosticos.length} predictions`);
    missingUsername++;
    continue;
  }

  for (const p of emp.pronosticos) {
    try {
      const { home, away } = parsePartido(p.partido);
      const { hs, as_ } = parseScore(p.pronostico);
      predictions.push({ username, empleado: emp.empleado, home, away, hs, as_ });
    } catch (e) {
      console.warn(`  Skipping prediction for ${emp.empleado} — ${e.message}`);
      skippedPreds++;
    }
  }
}

console.log(`Found ${predictions.length} predictions (${skippedPreds} skipped, ${missingUsername} users with no username)`);

// ---------------------------------------------------------------------------
// Generate SQL
// ---------------------------------------------------------------------------
const lines = [];

lines.push(`-- ============================================================`);
lines.push(`-- Auto-generated from backup: ${exportDate}`);
lines.push(`-- DO NOT EDIT — regenerate with generate-import-sql.js`);
lines.push(`-- ============================================================`);
lines.push(``);
lines.push(`BEGIN;`);
lines.push(``);

// ── Match results ──────────────────────────────────────────────────────────
lines.push(`-- ============================================================`);
lines.push(`-- Match results (${matchResults.size} finished matches)`);
lines.push(`-- ============================================================`);
lines.push(``);

for (const [, m] of matchResults) {
  lines.push(
    `UPDATE matches` +
    ` SET home_score = ${m.hs}, away_score = ${m.as_}, status = 'finished'` +
    ` WHERE home_team = '${esc(m.home)}' AND away_team = '${esc(m.away)}';`
  );
}

lines.push(``);

// ── Predictions ────────────────────────────────────────────────────────────
lines.push(`-- ============================================================`);
lines.push(`-- Predictions (${predictions.length} rows)`);
lines.push(`-- ============================================================`);
lines.push(``);

// Group by user for readability
let lastUser = null;
for (const p of predictions) {
  if (p.empleado !== lastUser) {
    if (lastUser !== null) lines.push(``);
    lines.push(`-- ${p.empleado} (${p.username})`);
    lastUser = p.empleado;
  }

  lines.push(
    `INSERT INTO predictions (user_id, match_id, home_score, away_score)` +
    ` SELECT u.id, m.id, ${p.hs}, ${p.as_}` +
    ` FROM users u, matches m` +
    ` WHERE u.username = '${esc(p.username)}'` +
    ` AND m.home_team = '${esc(p.home)}' AND m.away_team = '${esc(p.away)}'` +
    ` ON CONFLICT (user_id, match_id) DO NOTHING;`
  );
}

lines.push(``);
lines.push(`COMMIT;`);
lines.push(``);

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const sql = lines.join('\n');
writeFileSync(outputPath, sql, 'utf-8');

const totalLines = lines.length;
console.log(`\nGenerated: ${resolve(outputPath)}`);
console.log(`  Lines   : ${totalLines}`);
console.log(`  Matches : ${matchResults.size}`);
console.log(`  Preds   : ${predictions.length}`);

if (missingUsername > 0) {
  console.warn(`\n  ⚠  ${missingUsername} user(s) had no resolvable username — review the warnings above.`);
}
