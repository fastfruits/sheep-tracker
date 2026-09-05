import { execFileSync } from 'node:child_process';

/**
 * Reads the running local Supabase stack's connection details from
 * `supabase status -o env`.
 *
 * Everything that needs to point at the local stack goes through here —
 * the Vitest global setup, the seed script, the Playwright config and
 * `npm run dev:local` — so the CLI's output format is parsed in exactly one
 * place. It has changed between versions before (the keys were renamed, and
 * the key format moved from JWTs to `sb_publishable_…`/`sb_secret_…`), and one
 * parser means one place to fix.
 */

export interface LocalSupabaseEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export function readLocalSupabaseEnv(): LocalSupabaseEnv {
  let raw: string;
  try {
    raw = execFileSync('npx', ['--no-install', 'supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    throw new Error(
      'Could not read the local Supabase status. Is the stack running?\n\n' +
        '  npm run db:start\n\n' +
        `(underlying error: ${(e as Error).message})`
    );
  }

  const status = parseEnvOutput(raw);
  const url = status.API_URL;
  const anonKey = status.ANON_KEY;
  const serviceKey = status.SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      'Unexpected `supabase status -o env` output: expected API_URL, ANON_KEY and ' +
        `SERVICE_ROLE_KEY, got [${Object.keys(status).join(', ')}]. ` +
        'Check the installed Supabase CLI version.'
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  };
}

/** Applies the local values over whatever `.env*` supplied. */
export function applyLocalSupabaseEnv(): LocalSupabaseEnv {
  const env = readLocalSupabaseEnv();
  Object.assign(process.env, env);
  return env;
}

/** Parse the CLI's `KEY="value"` lines. Values may contain `=`, so split once. */
function parseEnvOutput(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    out[key] = line
      .slice(eq + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1');
  }
  return out;
}
