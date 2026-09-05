import { loadEnvConfig } from '@next/env';
import { assertLocalSupabase } from './guard';
import { applyLocalSupabaseEnv } from './local-env';

/**
 * Vitest globalSetup: point the suite at the running local Supabase stack.
 *
 * The connection details come from `supabase status`, not from any .env file.
 * That is the point: whatever `.env` says is overwritten here before a single
 * test file loads, which makes aiming the suite at the hosted project
 * structurally impossible rather than merely discouraged.
 *
 * Throwing from globalSetup aborts the whole run, so a stopped stack fails
 * loudly with instructions instead of half-running against stale values.
 */
export default function setup() {
  // Load .env* with Next's own precedence first, so anything the app reads that
  // is NOT a Supabase connection detail behaves as it does under `next dev`.
  loadEnvConfig(process.cwd());

  applyLocalSupabaseEnv();

  // Nothing in the suite may send a real text.
  process.env.SMS_TRANSPORT = 'outbox';

  assertLocalSupabase();

  // Workers are spawned after this returns and inherit process.env, so the
  // overwrite above reaches them. tests/helpers/setup.ts re-runs the guard in
  // each worker so that if that ever stops being true, the suite fails closed
  // rather than quietly falling back to `.env`'s hosted credentials.
}
