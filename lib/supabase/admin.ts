import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS — server-only, never import from a Client
 * Component. Used by the report action to write `notifications` rows addressed
 * to *other* users, which is the one thing a user's own session must not be
 * allowed to do directly (otherwise anyone can fabricate farmer alerts).
 *
 * The env var deliberately has no NEXT_PUBLIC_ prefix; with one, Next.js would
 * inline it into the client bundle and hand every visitor full database access.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (server-only)');

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
