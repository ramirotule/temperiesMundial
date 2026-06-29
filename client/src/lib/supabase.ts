import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------------------------

/** Anon client — used for all read operations and prediction writes */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

/** Service-role client — used for admin operations only */
export const getAdminClient = () =>
  createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string,
  );

// ---------------------------------------------------------------------------
// Case-conversion utilities
// ---------------------------------------------------------------------------

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
  : S;

type CamelToSnake<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Tail extends Uncapitalize<Tail>
    ? `${Lowercase<Head>}${CamelToSnake<Tail>}`
    : `${Lowercase<Head>}_${CamelToSnake<Uncapitalize<Tail>>}`
  : S;

// Runtime helpers (no generics — just plain object transforms)

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/** Convert a single flat object's keys from snake_case → camelCase */
export function toCamelCase<T = Record<string, unknown>>(
  row: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamelKey(key)] = value;
  }
  return result as T;
}

/** Convert a single flat object's keys from camelCase → snake_case */
export function toSnakeCase<T = Record<string, unknown>>(
  obj: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnakeKey(key)] = value;
  }
  return result as T;
}

/** Map an array of snake_case rows to camelCase */
export function mapRows<T = Record<string, unknown>>(
  rows: Record<string, unknown>[],
): T[] {
  return rows.map((row) => toCamelCase<T>(row));
}

// Suppress unused-type warnings for the conditional type helpers above
export type { SnakeToCamel, CamelToSnake };
