import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertLocalSupabase } from './guard';

/**
 * Supabase clients for tests.
 *
 * Both factories call assertLocalSupabase() before constructing anything, so a
 * test that builds its own client cannot route around the loopback-only check
 * in global-setup.
 */

/** Service-role client: bypasses RLS. Use for seeding and for assertions. */
export function adminClient(): SupabaseClient {
  assertLocalSupabase();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Anon-key client, optionally signed in as a user. RLS applies — this is what
 * the RLS tests need, since they assert what a real visitor's session can and
 * cannot reach.
 */
export async function anonClient(credentials?: {
  email: string;
  password: string;
}): Promise<SupabaseClient> {
  assertLocalSupabase();
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  if (credentials) {
    const { error } = await client.auth.signInWithPassword(credentials);
    if (error) throw new Error(`Test sign-in failed for ${credentials.email}: ${error.message}`);
  }

  return client;
}
