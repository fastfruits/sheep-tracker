import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Species } from '@/lib/types';
import { adminClient } from './db';

/**
 * Per-test fixtures.
 *
 * Every user gets a random email, so no test shares state with another and
 * nothing needs truncating between tests. That is what makes the suite
 * order-independent and safe to run in parallel: assertions are always scoped
 * by farmer_id / post_id, so rows left behind by other tests are invisible.
 *
 * Users are created with the admin API rather than SQL because an auth.users
 * row needs a bcrypt password and a matching auth.identities row, and that
 * shape has changed across GoTrue versions.
 */

export const TEST_PASSWORD = 'test-password-123';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export interface TestAnimal {
  id: string;
  ownerId: string;
  species: Species;
  name: string;
  primaryColor: string;
}

/** Tracks everything created so a test file can clean up after itself. */
export class Fixtures {
  private readonly db: SupabaseClient;
  private readonly userIds: string[] = [];

  constructor(db: SupabaseClient = adminClient()) {
    this.db = db;
  }

  async createUser(opts: { isFarmer?: boolean; farmName?: string; name?: string } = {}): Promise<TestUser> {
    const email = `test-${randomUUID()}@example.test`;
    const name = opts.name ?? (opts.isFarmer ? 'Test Farmer' : 'Test Reporter');

    const { data, error } = await this.db.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);

    // Service role bypasses the `auth.uid() = id` insert check on profiles.
    const { error: profileError } = await this.db.from('profiles').insert({
      id: data.user.id,
      name,
      is_farmer: opts.isFarmer ?? false,
      farm_name: opts.isFarmer ? (opts.farmName ?? 'Test Farm') : null,
    });
    if (profileError) throw new Error(`profile insert failed: ${profileError.message}`);

    this.userIds.push(data.user.id);
    return { id: data.user.id, email, password: TEST_PASSWORD, name };
  }

  async createFarmer(farmName = 'Test Farm'): Promise<TestUser> {
    return this.createUser({ isFarmer: true, farmName });
  }

  async createReporter(): Promise<TestUser> {
    return this.createUser({ isFarmer: false });
  }

  async createAnimal(
    owner: TestUser,
    animal: { species: Species; name: string; primaryColor: string; markings?: string }
  ): Promise<TestAnimal> {
    const { data, error } = await this.db
      .from('animals')
      .insert({
        owner_id: owner.id,
        species: animal.species,
        name: animal.name,
        primary_color: animal.primaryColor,
        markings: animal.markings ?? null,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`animal insert failed: ${error?.message}`);

    return { id: data.id, ownerId: owner.id, ...animal };
  }

  /** A sighting post, matching what reportSighting() writes. */
  async createSighting(
    reporter: TestUser,
    post: {
      species: Species;
      primaryColor: string;
      caption?: string;
      locationLabel?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }
  ): Promise<{ id: string }> {
    const { data, error } = await this.db
      .from('posts')
      .insert({
        user_id: reporter.id,
        caption: post.caption ?? `Spotted a ${post.species}`,
        species: post.species,
        primary_color: post.primaryColor,
        location_label: post.locationLabel ?? null,
        latitude: post.latitude ?? null,
        longitude: post.longitude ?? null,
        is_sighting: true,
        sighting_status: 'open',
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`post insert failed: ${error?.message}`);
    return { id: data.id };
  }

  /**
   * Deletes every user this instance created. `profiles`, `posts`, `animals`
   * and `notifications` all cascade from auth.users, so this is enough.
   */
  async cleanup(): Promise<void> {
    for (const id of this.userIds.splice(0)) {
      await this.db.auth.admin.deleteUser(id);
    }
  }
}
