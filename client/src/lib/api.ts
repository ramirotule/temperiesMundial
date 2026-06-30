import { supabase, getAdminClient, toCamelCase, mapRows } from './supabase';
import type { Match, Prediction, User } from '../types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Authenticate a user via the Postgres security-definer RPC.
 * Returns the user row (no password) or null on bad credentials.
 */
export async function authenticate(
  userId: string,
  password: string,
): Promise<User | null> {
  const { data, error } = await supabase.rpc('authenticate', {
    p_user_id: userId,
    p_password: password,
  });

  if (error || !data || data.length === 0) return null;

  return toCamelCase<User>(data[0] as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** Fetch all public users (no password column). */
export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users_public').select('*');
  if (error) throw new Error(`fetchUsers: ${error.message}`);
  return mapRows<User>((data ?? []) as Record<string, unknown>[]);
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

/** Fetch all matches. */
export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase.from('matches').select('*');
  if (error) throw new Error(`fetchMatches: ${error.message}`);
  return mapRows<Match>((data ?? []) as Record<string, unknown>[]);
}

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------

/**
 * Fetch predictions for all users and apply the same visibility rule as the
 * Express server:
 *   - If the match has NOT yet started + 1 min, other users' predictions are
 *     hidden (homeScore/awayScore = null, isBlocked = true).
 *   - The current user always sees their own predictions.
 *
 * Returns: { [userId]: { [matchId]: Prediction } }
 */
export async function fetchPredictions(
  currentUserId: string,
): Promise<Record<string, Record<string, Prediction>>> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*, matches(*)');

  if (error) throw new Error(`fetchPredictions: ${error.message}`);

  const now = new Date();
  const predictionMap: Record<string, Record<string, Prediction>> = {};

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const userId = row['user_id'] as string;
    const matchId = row['match_id'] as string;
    const matchRow = row['matches'] as Record<string, unknown> | null;
    const matchDate = matchRow ? new Date(matchRow['date'] as string) : null;

    const isMatchStartedPlus1Min =
      matchDate !== null &&
      now.getTime() >= matchDate.getTime() + 60 * 1000;

    const isOwnPrediction = userId === currentUserId;
    const canSee = isOwnPrediction || isMatchStartedPlus1Min;

    if (!predictionMap[userId]) predictionMap[userId] = {};

    predictionMap[userId][matchId] = {
      homeScore: canSee ? (row['home_score'] as number) : null as unknown as number,
      awayScore: canSee ? (row['away_score'] as number) : null as unknown as number,
      isBlocked: !canSee,
      createdAt: row['created_at'] as string,
      penaltyWinner: canSee ? (row['penalty_winner'] as 'home' | 'away' | null) : null,
    };
  }

  return predictionMap;
}

/**
 * Upsert a single prediction (INSERT or UPDATE on conflict user_id+match_id).
 */
export async function upsertPrediction(data: {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinner?: 'home' | 'away' | null;
}): Promise<void> {
  const { error } = await supabase.from('predictions').upsert(
    {
      user_id: data.userId,
      match_id: data.matchId,
      home_score: data.homeScore,
      away_score: data.awayScore,
      penalty_winner: data.penaltyWinner ?? null,
    },
    { onConflict: 'user_id,match_id' },
  );

  if (error) throw new Error(`upsertPrediction: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Admin — Match management
// ---------------------------------------------------------------------------

/**
 * Update a match (score, status, date). Uses the service-role client to bypass
 * RLS.
 */
export async function updateMatch(
  matchId: string,
  data: {
    homeScore?: number | null;
    awayScore?: number | null;
    status?: Match['status'];
    date?: string;
    penaltyWinner?: 'home' | 'away' | null;
  },
): Promise<Match> {
  const adminClient = getAdminClient();

  const payload: Record<string, unknown> = {};
  if ('homeScore' in data) payload['home_score'] = data.homeScore;
  if ('awayScore' in data) payload['away_score'] = data.awayScore;
  if ('status' in data) payload['status'] = data.status;
  if ('date' in data) payload['date'] = data.date;
  if ('penaltyWinner' in data) payload['penalty_winner'] = data.penaltyWinner ?? null;

  const { data: updated, error } = await adminClient
    .from('matches')
    .update(payload)
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw new Error(`updateMatch: ${error.message}`);
  return toCamelCase<Match>(updated as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Admin — Predictions management
// ---------------------------------------------------------------------------

/** Delete all predictions (reset everyone's scores to 0). */
export async function clearPredictions(): Promise<void> {
  const adminClient = getAdminClient();
  // .neq('id', '') matches every row — safe way to delete all without .delete()
  // requiring a filter in supabase-js v2
  const { error } = await adminClient
    .from('predictions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) throw new Error(`clearPredictions: ${error.message}`);
}

/** Reset all matches to scheduled status with no scores. */
export async function resetMatches(): Promise<void> {
  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from('matches')
    .update({ home_score: null, away_score: null, status: 'scheduled', penalty_winner: null })
    .neq('id', '');

  if (error) throw new Error(`resetMatches: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Admin — Backup
// ---------------------------------------------------------------------------

/** Download a full database backup (users + matches + predictions). */
export async function downloadBackup(): Promise<{
  timestamp: string;
  data: { users: unknown[]; matches: unknown[]; predictions: unknown[] };
}> {
  const adminClient = getAdminClient();

  const [usersRes, matchesRes, predictionsRes] = await Promise.all([
    adminClient.from('users').select('*'),
    adminClient.from('matches').select('*'),
    adminClient.from('predictions').select('*'),
  ]);

  if (usersRes.error) throw new Error(`backup users: ${usersRes.error.message}`);
  if (matchesRes.error) throw new Error(`backup matches: ${matchesRes.error.message}`);
  if (predictionsRes.error) throw new Error(`backup predictions: ${predictionsRes.error.message}`);

  return {
    timestamp: new Date().toISOString(),
    data: {
      users: usersRes.data ?? [],
      matches: matchesRes.data ?? [],
      predictions: predictionsRes.data ?? [],
    },
  };
}

/**
 * Fetch ALL predictions without visibility filtering — used by admin export.
 * Returns: { [userId]: { [matchId]: Prediction } }
 */
export async function fetchAdminPredictions(): Promise<
  Record<string, Record<string, Prediction>>
> {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from('predictions')
    .select('*, matches(*)');

  if (error) throw new Error(`fetchAdminPredictions: ${error.message}`);

  const predictionMap: Record<string, Record<string, Prediction>> = {};

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const userId = row['user_id'] as string;
    const matchId = row['match_id'] as string;

    if (!predictionMap[userId]) predictionMap[userId] = {};

    predictionMap[userId][matchId] = {
      homeScore: row['home_score'] as number,
      awayScore: row['away_score'] as number,
      isBlocked: false,
      createdAt: row['created_at'] as string,
      penaltyWinner: row['penalty_winner'] as 'home' | 'away' | null,
    };
  }

  return predictionMap;
}
