import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { assertLocalSupabase } from '../helpers/guard';
import { applyLocalSupabaseEnv } from '../helpers/local-env';

/**
 * Deterministic fixtures for the Playwright suite: one farmer with a
 * registered animal, and one reporter.
 *
 * Not `supabase/seed.sql`, because an auth.users row needs a bcrypt
 * `encrypted_password` and a matching auth.identities row, and that shape has
 * changed across GoTrue versions — hand-written SQL for it breaks on CLI
 * upgrades with an opaque "invalid login credentials".
 *
 * Idempotent: existing seed users are deleted and recreated, so `npm run
 * db:seed` is safe to re-run.
 *
 *   npm run db:seed
 */

export const SEED_PASSWORD = 'test-password-123';

export const SEED_FARMER = {
  email: 'farmer@example.test',
  password: SEED_PASSWORD,
  name: 'Mary Farmer',
  farmName: 'Ballyroan Farm',
};

export const SEED_REPORTER = {
  email: 'reporter@example.test',
  password: SEED_PASSWORD,
  name: 'Sam Walker',
};

/** The animal the E2E specs report a matching sighting of. */
export const SEED_ANIMAL = {
  species: 'sheep' as const,
  name: 'Dolly',
  primaryColor: 'white',
  markings: 'blue paint on back',
};

function localEnv() {
  loadEnvConfig(process.cwd());
  applyLocalSupabaseEnv();
  assertLocalSupabase();
}

export async function seed() {
  localEnv();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Remove any previous run. profiles / posts / animals / notifications all
  // cascade from auth.users, so deleting the user is enough.
  const { data: existing } = await db.auth.admin.listUsers();
  for (const user of existing?.users ?? []) {
    if (user.email === SEED_FARMER.email || user.email === SEED_REPORTER.email) {
      await db.auth.admin.deleteUser(user.id);
    }
  }

  const create = async (spec: { email: string; password: string; name: string; farmName?: string }) => {
    const { data, error } = await db.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser ${spec.email}: ${error?.message}`);

    const { error: profileError } = await db.from('profiles').insert({
      id: data.user.id,
      name: spec.name,
      is_farmer: Boolean(spec.farmName),
      farm_name: spec.farmName ?? null,
    });
    if (profileError) throw new Error(`profile ${spec.email}: ${profileError.message}`);

    return data.user.id;
  };

  const farmerId = await create(SEED_FARMER);
  const reporterId = await create(SEED_REPORTER);

  const { error: animalError } = await db.from('animals').insert({
    owner_id: farmerId,
    species: SEED_ANIMAL.species,
    name: SEED_ANIMAL.name,
    primary_color: SEED_ANIMAL.primaryColor,
    markings: SEED_ANIMAL.markings,
  });
  if (animalError) throw new Error(`animal: ${animalError.message}`);

  // A clean slate for the specs, which assert on exact badge counts.
  await db.from('notifications').delete().eq('farmer_id', farmerId);
  await db.from('posts').delete().eq('user_id', reporterId);

  console.log(`Seeded:
  farmer   ${SEED_FARMER.email}   (${SEED_FARMER.farmName}, owns ${SEED_ANIMAL.name})
  reporter ${SEED_REPORTER.email}
  password ${SEED_PASSWORD}`);

  return { farmerId, reporterId };
}

// Only run when invoked directly (`npm run db:seed`), not when imported by a
// Playwright setup project.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  seed().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
