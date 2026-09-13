import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyMatchingFarmers } from '@/lib/notify';
import { adminClient, anonClient } from '../helpers/db';
import { Fixtures, type TestUser } from '../helpers/fixtures';
import type { Marking } from '@/lib/markings';

/**
 * `lib/notify.ts` against a real local Postgres, with real RLS.
 *
 * Isolation note, and it is load-bearing: matching reads EVERY registered
 * animal of the reported species across all owners — that is the feature, not
 * an accident. So scoping assertions by post_id is not enough; animals seeded
 * by a neighbouring test would show up in `matched` and break the counts.
 *
 * Each test therefore invents a unique colour token via `uniqueColour()` and
 * uses it for both the sighting and the animals it cares about. Colours are
 * free text in this schema, so this is realistic input, and the match rule
 * (substring / shared-word) cannot connect two distinct random tokens. That
 * buys per-test isolation with no truncation and no serialisation.
 */

/** A colour no other test will match on. */
function uniqueColour() {
  return `c${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

let db: SupabaseClient;
let fx: Fixtures;

beforeAll(() => {
  db = adminClient();
  fx = new Fixtures(db);
});

afterAll(async () => {
  await fx.cleanup();
});

/** The notification rows a given post produced. */
async function alertsFor(postId: string) {
  const { data, error } = await db.from('notifications').select('*').eq('post_id', postId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

function inputFor(
  post: { id: string },
  reporter: TestUser,
  primaryColor: string,
  overrides: Partial<Parameters<typeof notifyMatchingFarmers>[0]> = {}
) {
  return {
    postId: post.id,
    reporterId: reporter.id,
    species: 'sheep' as const,
    primaryColor,
    reporterName: reporter.name,
    caption: 'Spotted a sheep near the crossroads',
    locationLabel: 'Ballyroan, Laois',
    latitude: 52.9,
    longitude: -7.3,
    ...overrides,
  };
}

describe('notifyMatchingFarmers', () => {
  it('writes exactly one row, with every column populated', async () => {
    const colour = uniqueColour();
    const farmer = await fx.createFarmer('Ballyroan Farm');
    const animal = await fx.createAnimal(farmer, {
      species: 'sheep',
      name: 'Dolly',
      primaryColor: colour,
    });
    const reporter = await fx.createReporter();
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour });

    const result = await notifyMatchingFarmers(inputFor(post, reporter, colour), { db });

    expect(result.notified).toBe(1);
    expect(result.errors).toEqual([]);
    // The exact shape components/report-form.tsx renders. A colour-only match
    // reports `possible` with nothing corroborating it, which is what stops
    // the success screen presenting a coincidence as a certainty.
    expect(result.matched).toEqual([
      {
        id: animal.id,
        name: 'Dolly',
        ownerName: farmer.name,
        farmName: 'Ballyroan Farm',
        confidence: 'possible',
        matchedMarkings: [],
      },
    ]);

    const rows = await alertsFor(post.id);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.farmer_id).toBe(farmer.id);
    expect(row.post_id).toBe(post.id);
    expect(row.animal_id).toBe(animal.id);
    expect(row.animal_name).toBe('Dolly');
    expect(row.species).toBe('sheep');
    expect(row.reporter_name).toBe(reporter.name);
    expect(row.reporter_caption).toBe('Spotted a sheep near the crossroads');
    expect(row.reported_markings).toBeNull();
    expect(row.location_label).toBe('Ballyroan, Laois');
    expect(row.latitude).toBeCloseTo(52.9);
    expect(row.longitude).toBeCloseTo(-7.3);
    expect(row.read).toBe(false);
    expect(row.created_at).toBeTruthy();
  });

  it('writes nothing when no animal matches', async () => {
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    await fx.createAnimal(farmer, { species: 'sheep', name: 'Blackie', primaryColor: uniqueColour() });
    const reporter = await fx.createReporter();
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour });

    const result = await notifyMatchingFarmers(inputFor(post, reporter, colour), { db });

    expect(result.matched).toEqual([]);
    expect(result.notified).toBe(0);
    expect(result.errors).toEqual([]);
    expect(await alertsFor(post.id)).toHaveLength(0);
  });

  it('filters by species in SQL, not just in the match rule', async () => {
    // A cow of exactly the reported colour must produce no row. Asserting the
    // row count rather than `matched` is the point: matchAnimals would filter
    // this out anyway, so only a count catches a dropped `.eq('species', …)`.
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    await fx.createAnimal(farmer, { species: 'cow', name: 'Daisy', primaryColor: colour });
    const reporter = await fx.createReporter();
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour });

    await notifyMatchingFarmers(inputFor(post, reporter, colour), { db });

    expect(await alertsFor(post.id)).toHaveLength(0);
  });

  it('writes one row per matching animal when a farmer owns several', async () => {
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    const dolly = await fx.createAnimal(farmer, {
      species: 'sheep',
      name: 'Dolly',
      primaryColor: colour,
    });
    const shaun = await fx.createAnimal(farmer, {
      species: 'sheep',
      name: 'Shaun',
      primaryColor: colour,
    });
    const reporter = await fx.createReporter();
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour });

    const result = await notifyMatchingFarmers(inputFor(post, reporter, colour), { db });

    expect(result.notified).toBe(2);
    const rows = await alertsFor(post.id);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.farmer_id === farmer.id)).toBe(true);
    expect(new Set(rows.map(r => r.animal_id))).toEqual(new Set([dolly.id, shaun.id]));
  });

  it('notifies each of two different owners once', async () => {
    const colour = uniqueColour();
    const farmerA = await fx.createFarmer('Farm A');
    const farmerB = await fx.createFarmer('Farm B');
    await fx.createAnimal(farmerA, { species: 'sheep', name: 'Dolly', primaryColor: colour });
    await fx.createAnimal(farmerB, { species: 'sheep', name: 'Snowy', primaryColor: colour });
    const reporter = await fx.createReporter();
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour });

    const result = await notifyMatchingFarmers(inputFor(post, reporter, colour), { db });

    expect(result.notified).toBe(2);
    const rows = await alertsFor(post.id);
    const byFarmer = new Map(rows.map(r => [r.farmer_id, r.animal_name]));
    expect(byFarmer.get(farmerA.id)).toBe('Dolly');
    expect(byFarmer.get(farmerB.id)).toBe('Snowy');
  });

  it('does not notify a farmer about their own sighting', async () => {
    // A farmer reporting their own escaped sheep used to alert themselves and
    // light their own nav badge.
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    await fx.createAnimal(farmer, { species: 'sheep', name: 'Dolly', primaryColor: colour });
    const post = await fx.createSighting(farmer, { species: 'sheep', primaryColor: colour });

    const result = await notifyMatchingFarmers(inputFor(post, farmer, colour), { db });

    expect(result.matched).toEqual([]);
    expect(result.notified).toBe(0);
    expect(await alertsFor(post.id)).toHaveLength(0);
  });

  it('still notifies other farmers when the reporter is also a farmer', async () => {
    // The owner exclusion must be scoped to the reporter, not to farmers generally.
    const colour = uniqueColour();
    const owner = await fx.createFarmer('Neighbour Farm');
    await fx.createAnimal(owner, { species: 'sheep', name: 'Dolly', primaryColor: colour });
    const reportingFarmer = await fx.createFarmer('Reporter Farm');
    await fx.createAnimal(reportingFarmer, {
      species: 'sheep',
      name: 'Mine',
      primaryColor: colour,
    });
    const post = await fx.createSighting(reportingFarmer, {
      species: 'sheep',
      primaryColor: colour,
    });

    const result = await notifyMatchingFarmers(inputFor(post, reportingFarmer, colour), { db });

    expect(result.notified).toBe(1);
    const rows = await alertsFor(post.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].farmer_id).toBe(owner.id);
  });

  it('reports the match but not delivery when the insert fails', async () => {
    // Reproduced without stubs: delete the post so the notifications.post_id
    // foreign key rejects the insert. This is the shape of the bug that was
    // live in production, where the detail columns did not exist at all and
    // every insert failed while the UI still said "Farmer notified!".
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    await fx.createAnimal(farmer, { species: 'sheep', name: 'Dolly', primaryColor: colour });
    const reporter = await fx.createReporter();
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour });
    await db.from('posts').delete().eq('id', post.id);

    const result = await notifyMatchingFarmers(inputFor(post, reporter, colour), { db });

    expect(result.matched).toHaveLength(1);
    expect(result.notified).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/notifications insert/);
    expect(await alertsFor(post.id)).toHaveLength(0);
  });

  it('does not throw when the service-role key is missing', async () => {
    // Mirrors the degraded path in the action: the sighting is still saved and
    // visible in the feed, only the alert is skipped.
    const colour = uniqueColour();
    // Create the user before unsetting the key — the fixtures need it too, and
    // this test is about notify's own degradation, not the fixtures'.
    const reporter = await fx.createReporter();

    const original = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const result = await notifyMatchingFarmers(
        inputFor({ id: '00000000-0000-0000-0000-000000000000' }, reporter, colour)
      );
      expect(result.matched).toEqual([]);
      expect(result.notified).toBe(0);
      expect(result.errors[0]).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = original;
    }
  });
});

describe('structured markings', () => {
  // The jsonb round trip. The unit tests pin the scoring rules; these pin that
  // the values actually survive Postgres and reach rankAnimals() as objects —
  // a `markings_details` column the hosted database is missing would fail here
  // the way the notifications columns failed silently in production.

  it('ranks an exactly-corroborated animal above a colour-only one', async () => {
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    const tagged = await fx.createAnimal(farmer, {
      species: 'sheep',
      name: 'Dolly',
      primaryColor: colour,
      markings: [{ type: 'ear_tag', color: 'yellow', location: 'left_ear' }],
    });
    await fx.createAnimal(farmer, { species: 'sheep', name: 'Shaun', primaryColor: colour });

    const reporter = await fx.createReporter();
    const markings: Marking[] = [{ type: 'ear_tag', color: 'yellow', location: 'left_ear' }];
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour, markings });

    const result = await notifyMatchingFarmers(
      inputFor(post, reporter, colour, { markings }),
      { db }
    );

    expect(result.notified).toBe(2);
    expect(result.matched[0].id).toBe(tagged.id);
    expect(result.matched[0].confidence).toBe('strong');
    expect(result.matched[0].matchedMarkings).toEqual(['yellow ear tag on left ear']);
    expect(result.matched[1].confidence).toBe('possible');
  });

  it('rules out an animal whose marking is contradicted in the same place', async () => {
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    await fx.createAnimal(farmer, {
      species: 'sheep',
      name: 'Dolly',
      primaryColor: colour,
      markings: [{ type: 'ear_tag', color: 'blue', location: 'left_ear' }],
    });

    const reporter = await fx.createReporter();
    const markings: Marking[] = [{ type: 'ear_tag', color: 'yellow', location: 'left_ear' }];
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour, markings });

    const result = await notifyMatchingFarmers(
      inputFor(post, reporter, colour, { markings }),
      { db }
    );

    // Same species, same colour — the old rule would have alerted this farmer.
    expect(result.matched).toEqual([]);
    expect(await alertsFor(post.id)).toHaveLength(0);
  });

  it('carries the reported markings onto the alert row', async () => {
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    await fx.createAnimal(farmer, { species: 'sheep', name: 'Dolly', primaryColor: colour });

    const reporter = await fx.createReporter();
    const markings: Marking[] = [
      { type: 'paint', color: 'blue', location: 'back' },
      { type: 'collar', color: 'red', location: 'neck' },
    ];
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour, markings });

    await notifyMatchingFarmers(inputFor(post, reporter, colour, { markings }), { db });

    const [row] = await alertsFor(post.id);
    expect(row.reported_markings).toBe('blue spray paint on back, red collar on neck');
  });

  it('matches an animal registered before markings were structured', async () => {
    // Its `markings_details` is the column default, so it scores 0 and the
    // colour rule decides — exactly as it did before this change.
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    await fx.createAnimal(farmer, { species: 'sheep', name: 'Dolly', primaryColor: colour });

    const reporter = await fx.createReporter();
    const markings: Marking[] = [{ type: 'ear_tag', color: 'yellow', location: 'left_ear' }];
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour, markings });

    const result = await notifyMatchingFarmers(
      inputFor(post, reporter, colour, { markings }),
      { db }
    );

    expect(result.notified).toBe(1);
    expect(result.matched[0].confidence).toBe('possible');
  });
});

describe('row-level security', () => {
  // These three cannot be expressed any other way, and they are what justifies
  // running tests against a real Postgres rather than mocking the client.

  it('hides one farmer’s notifications from another', async () => {
    const colour = uniqueColour();
    const farmerA = await fx.createFarmer();
    const farmerB = await fx.createFarmer();
    await fx.createAnimal(farmerA, { species: 'sheep', name: 'Dolly', primaryColor: colour });
    await fx.createAnimal(farmerB, { species: 'sheep', name: 'Snowy', primaryColor: colour });
    const reporter = await fx.createReporter();
    const post = await fx.createSighting(reporter, { species: 'sheep', primaryColor: colour });
    await notifyMatchingFarmers(inputFor(post, reporter, colour), { db });

    const asA = await anonClient({ email: farmerA.email, password: farmerA.password });
    const { data } = await asA.from('notifications').select('*').eq('post_id', post.id);

    expect(data).toHaveLength(1);
    expect(data![0].farmer_id).toBe(farmerA.id);
  });

  it('refuses a notification insert from a signed-in user', async () => {
    // Without this, any account could fabricate a farmer alert with a fake
    // animal, a fake reporter and fake GPS coordinates.
    const colour = uniqueColour();
    const farmer = await fx.createFarmer();
    const attacker = await fx.createReporter();
    const post = await fx.createSighting(attacker, { species: 'sheep', primaryColor: colour });

    const asAttacker = await anonClient({ email: attacker.email, password: attacker.password });
    const { error } = await asAttacker.from('notifications').insert({
      farmer_id: farmer.id,
      post_id: post.id,
      animal_name: 'Fake',
      reporter_name: 'Fake',
      latitude: 0,
      longitude: 0,
    });

    expect(error).not.toBeNull();
    expect(await alertsFor(post.id)).toHaveLength(0);
  });

  it('hides one farmer’s animals from another', async () => {
    // Catches an accidental re-run of rls.sql restoring the public read policy
    // that rls-web.sql dropped — which would ship every farm's inventory to
    // every visitor.
    const colour = uniqueColour();
    const farmerA = await fx.createFarmer();
    const farmerB = await fx.createFarmer();
    await fx.createAnimal(farmerA, { species: 'sheep', name: 'Mine', primaryColor: colour });
    await fx.createAnimal(farmerB, { species: 'sheep', name: 'Theirs', primaryColor: uniqueColour() });

    const asA = await anonClient({ email: farmerA.email, password: farmerA.password });
    const { data } = await asA.from('animals').select('*');

    expect(data).toHaveLength(1);
    expect(data![0].name).toBe('Mine');
  });
});
