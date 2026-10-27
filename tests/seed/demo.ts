import { loadEnvConfig } from '@next/env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertLocalSupabase } from '../helpers/guard';
import { applyLocalSupabaseEnv } from '../helpers/local-env';
import { formatMarkings, type Marking } from '@/lib/markings';
import type { Species } from '@/lib/types';

/**
 * A month of realistic-looking activity for clicking around the local app:
 * farmers with registered animals, reporters, and ~30 days of sightings and
 * community posts with likes, confirmations, comments, follows and farmer
 * alerts.
 *
 * Kept apart from seed.ts on purpose. The Playwright specs assert exact badge
 * counts for the E2E seed users, so this never touches them: every demo user
 * lives under @demo.example.test, and only those are deleted on re-run.
 *
 * Deterministic: a fixed-seed PRNG picks everything, and timestamps are
 * offsets from "now", so the feed always spans the last ~30 days no matter
 * when it is run.
 *
 *   npm run db:seed:demo
 */

export const DEMO_PASSWORD = 'test-password-123';
const DEMO_DOMAIN = '@demo.example.test';
const DAYS = 30;

type Person = { key: string; name: string; farmName?: string };

const PEOPLE: Person[] = [
  { key: 'tom',    name: 'Tom Brennan',     farmName: 'Glenmore Hill Farm' },
  { key: 'aoife',  name: 'Aoife Kavanagh',  farmName: 'Kavanagh Holdings' },
  { key: 'declan', name: 'Declan Murphy',   farmName: 'Slievebloom Uplands' },
  { key: 'niamh',  name: 'Niamh Doyle' },
  { key: 'liam',   name: 'Liam O\'Connor' },
  { key: 'grace',  name: 'Grace Fitzgerald' },
  { key: 'ciaran', name: 'Ciarán Walsh' },
  { key: 'emma',   name: 'Emma Byrne' },
];

type AnimalSpec = {
  owner: string;
  species: Species;
  name: string;
  primaryColor: string;
  markings: Marking[];
  tagNumber?: string;
};

const ANIMALS: AnimalSpec[] = [
  { owner: 'tom', species: 'sheep', name: 'Bramble', primaryColor: 'white', tagNumber: 'IE 372 0451',
    markings: [{ type: 'paint', color: 'red', location: 'rump' }, { type: 'ear_tag', color: 'yellow', location: 'right_ear' }] },
  { owner: 'tom', species: 'sheep', name: 'Clover', primaryColor: 'white',
    markings: [{ type: 'paint', color: 'red', location: 'shoulder' }] },
  { owner: 'tom', species: 'sheep', name: 'Ebony', primaryColor: 'black',
    markings: [{ type: 'ear_tag', color: 'yellow', location: 'left_ear' }] },
  { owner: 'aoife', species: 'cow', name: 'Rosie', primaryColor: 'brown', tagNumber: 'IE 154 2210',
    markings: [{ type: 'ear_tag', color: 'yellow', location: 'both_ears' }, { type: 'patch', color: 'white', location: 'head' }] },
  { owner: 'aoife', species: 'goat', name: 'Pepper', primaryColor: 'gray',
    markings: [{ type: 'collar', color: 'green', location: 'neck' }, { type: 'bell', color: 'other', location: 'neck' }] },
  { owner: 'aoife', species: 'horse', name: 'Juniper', primaryColor: 'brown',
    markings: [{ type: 'halter', color: 'blue', location: 'head' }, { type: 'patch', color: 'white', location: 'legs' }] },
  { owner: 'declan', species: 'sheep', name: 'Murphy', primaryColor: 'white',
    markings: [{ type: 'paint', color: 'blue', location: 'side' }, { type: 'horn_tag', color: 'orange', location: 'horns' }] },
  { owner: 'declan', species: 'sheep', name: 'Heather', primaryColor: 'white',
    markings: [{ type: 'paint', color: 'blue', location: 'back' }] },
  { owner: 'declan', species: 'dog', name: 'Scout', primaryColor: 'black',
    markings: [{ type: 'collar', color: 'red', location: 'neck' }] },
];

/** Midlands townlands, so the map pins cluster believably. */
const PLACES: { label: string; lat: number; lng: number }[] = [
  { label: 'Ballyroan, Co. Laois',          lat: 52.9447, lng: -7.2958 },
  { label: 'Abbeyleix, Co. Laois',          lat: 52.9150, lng: -7.3480 },
  { label: 'Mountrath, Co. Laois',          lat: 52.9993, lng: -7.4740 },
  { label: 'Slieve Bloom Way, Co. Offaly',  lat: 53.0690, lng: -7.5810 },
  { label: 'Durrow, Co. Laois',             lat: 52.8450, lng: -7.3960 },
  { label: 'Stradbally, Co. Laois',         lat: 53.0160, lng: -7.1520 },
  { label: 'Timahoe, Co. Laois',            lat: 52.9620, lng: -7.2040 },
  { label: 'R430 near Ballacolla',          lat: 52.8770, lng: -7.4500 },
  { label: 'Rock of Dunamase',              lat: 53.0320, lng: -7.2100 },
  { label: 'Clonaslee, Co. Offaly',         lat: 53.1490, lng: -7.5250 },
];

type SightingSpec = {
  species: Species;
  primaryColor: string;
  markings: Marking[];
  captions: string[];
  /** The registered animal this is a sighting of, if any — gets a farmer alert. */
  of?: string;
};

const SIGHTINGS: SightingSpec[] = [
  { of: 'Bramble', species: 'sheep', primaryColor: 'white',
    markings: [{ type: 'paint', color: 'red', location: 'rump' }],
    captions: ['Ewe with a red mark on her rump grazing the verge.', 'Single sheep out on the road, red paint on the back end.'] },
  { of: 'Ebony', species: 'sheep', primaryColor: 'black',
    markings: [{ type: 'ear_tag', color: 'yellow', location: 'unknown' }],
    captions: ['Black sheep on its own by the bog road. Yellow tag, couldn\'t see which ear.'] },
  { of: 'Rosie', species: 'cow', primaryColor: 'brown',
    markings: [{ type: 'ear_tag', color: 'yellow', location: 'both_ears' }],
    captions: ['Brown cow wandered into the GAA pitch car park.', 'Cow in the lane behind the church, tags in both ears.'] },
  { of: 'Pepper', species: 'goat', primaryColor: 'gray',
    markings: [{ type: 'collar', color: 'green', location: 'neck' }],
    captions: ['Grey goat with a green collar eating someone\'s hedge.', 'Goat with a bell up on the wall by the old mill.'] },
  { of: 'Murphy', species: 'sheep', primaryColor: 'white',
    markings: [{ type: 'paint', color: 'blue', location: 'side' }, { type: 'horn_tag', color: 'orange', location: 'horns' }],
    captions: ['Horned ram, blue on his side, orange tag on a horn. Not bothered by traffic at all.'] },
  { of: 'Scout', species: 'dog', primaryColor: 'black',
    markings: [{ type: 'collar', color: 'red', location: 'neck' }],
    captions: ['Black collie with a red collar running loose near the sheep.'] },
  { species: 'sheep', primaryColor: 'white',
    markings: [{ type: 'paint', color: 'green', location: 'shoulder' }],
    captions: ['Three ewes through a gap in the ditch, green paint marks.', 'Small group of sheep on the hill road, green on the shoulder.'] },
  { species: 'sheep', primaryColor: 'white', markings: [],
    captions: ['Lamb on its own crying at the gate, no marks I could see.', 'Sheep stuck in a briar patch, got it out but no idea whose it is.'] },
  { species: 'cow', primaryColor: 'black',
    markings: [{ type: 'ear_tag', color: 'yellow', location: 'left_ear' }],
    captions: ['Black heifer out on the main road, slow down if you\'re passing.'] },
  { species: 'horse', primaryColor: 'gray',
    markings: [{ type: 'halter', color: 'red', location: 'head' }],
    captions: ['Grey pony with a red head collar in the field by the forest entrance.'] },
  { species: 'chicken', primaryColor: 'brown', markings: [],
    captions: ['A few hens have taken up residence in our shed. Anyone missing chickens?'] },
  { species: 'pig', primaryColor: 'pink', markings: [],
    captions: ['Genuinely a pig trotting down the footpath. Headed towards the village.'] },
];

const COMMUNITY_CAPTIONS = [
  'Lambing finally wrapped up. Thanks to everyone who kept an eye out this season.',
  'Reminder: gates on the Slieve Bloom Way have been left open a few times this week.',
  'Fence on the bog road is down again after the storm, careful with stock out that way.',
  'Mart prices up again this week, anyone heading to Abbeyleix Thursday?',
  'Great to see so many sightings resolved this month. This app is working.',
  'Does anyone know a good fencing contractor around Mountrath?',
  'Shearing done for the year. The flock looks half the size.',
  'Lovely morning up at Dunamase, sheep everywhere and all of them where they should be for once.',
];

const COMMENTS = [
  'Saw this one too this morning.',
  'Think that\'s one of Tom\'s, I\'ll give him a shout.',
  'Still there as of an hour ago.',
  'Thanks for posting!',
  'Heading that way now, will check.',
  'Was gone by the time I passed.',
  'That\'s mine, collected her this evening. Thank you!',
  'Same here, saw it near the crossroads.',
  'Good spot.',
  'Fair play.',
];

/** mulberry32: small, fast, and identical output for the same seed on every run. */
function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = prng(20261026);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const sample = <T,>(xs: readonly T[], n: number): T[] =>
  [...xs].sort(() => rand() - 0.5).slice(0, Math.min(n, xs.length));
const jitter = (n: number, spread = 0.01) => n + (rand() - 0.5) * spread;

function localEnv() {
  loadEnvConfig(process.cwd());
  applyLocalSupabaseEnv();
  assertLocalSupabase();
}

async function insert(db: SupabaseClient, table: string, rows: object[]) {
  if (rows.length === 0) return;
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
}

export async function seedDemo() {
  localEnv();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Everything else cascades from auth.users.
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const user of existing?.users ?? []) {
    if (user.email?.endsWith(DEMO_DOMAIN)) await db.auth.admin.deleteUser(user.id);
  }

  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

  // ── Users ──────────────────────────────────────────────────────────────────
  const ids = new Map<string, string>();
  for (const p of PEOPLE) {
    const { data, error } = await db.auth.admin.createUser({
      email: `${p.key}${DEMO_DOMAIN}`,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser ${p.key}: ${error?.message}`);
    ids.set(p.key, data.user.id);
  }
  await insert(db, 'profiles', PEOPLE.map(p => ({
    id: ids.get(p.key),
    name: p.name,
    is_farmer: Boolean(p.farmName),
    farm_name: p.farmName ?? null,
    // Joined a bit before the first post.
    created_at: daysAgo(DAYS + 5 + rand() * 20),
  })));

  const userIds = [...ids.values()];
  const farmers = PEOPLE.filter(p => p.farmName).map(p => p.key);
  const reporters = PEOPLE.filter(p => !p.farmName).map(p => p.key);
  const nameOf = (key: string) => PEOPLE.find(p => p.key === key)!.name;

  // ── Animals ────────────────────────────────────────────────────────────────
  const { data: animalRows, error: animalError } = await db
    .from('animals')
    .insert(ANIMALS.map(a => ({
      owner_id: ids.get(a.owner),
      species: a.species,
      name: a.name,
      primary_color: a.primaryColor,
      markings: formatMarkings(a.markings) || null,
      markings_details: a.markings,
      tag_number: a.tagNumber ?? null,
      created_at: daysAgo(DAYS + 2 + rand() * 10),
    })))
    .select('id, name, owner_id, species');
  if (animalError || !animalRows) throw new Error(`animals: ${animalError?.message}`);
  const animalByName = new Map(animalRows.map(a => [a.name as string, a]));

  // ── Posts ──────────────────────────────────────────────────────────────────
  // Roughly 1–3 a day, oldest first. Older sightings are more likely to have
  // been resolved; the last few days are mostly still open.
  type PostRow = Record<string, unknown>;
  const drafts: { row: PostRow; of?: string; author: string; age: number }[] = [];

  for (let day = DAYS; day >= 0; day--) {
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const age = day + rand() * 0.9;
      if (rand() < 0.72) {
        const s = pick(SIGHTINGS);
        const place = pick(PLACES);
        const author = rand() < 0.75 ? pick(reporters) : pick(farmers);
        const status = age > 7
          ? pick(['resolved', 'resolved', 'resolved', 'open'] as const)
          : age > 2 ? pick(['open', 'open', 'resolved'] as const) : 'open';
        drafts.push({ of: s.of, author, age, row: {
          user_id: ids.get(author),
          caption: pick(s.captions),
          species: s.species,
          primary_color: s.primaryColor,
          markings: formatMarkings(s.markings) || null,
          markings_details: s.markings,
          location_label: place.label,
          latitude: jitter(place.lat),
          longitude: jitter(place.lng),
          is_sighting: true,
          sighting_status: status,
          created_at: daysAgo(age),
        } });
      } else {
        const author = pick(PEOPLE).key;
        drafts.push({ author, age, row: {
          user_id: ids.get(author),
          caption: pick(COMMUNITY_CAPTIONS),
          is_sighting: false,
          created_at: daysAgo(age),
        } });
      }
    }
  }

  const { data: postRows, error: postError } = await db
    .from('posts')
    .insert(drafts.map(d => d.row))
    .select('id, user_id, created_at');
  if (postError || !postRows) throw new Error(`posts: ${postError?.message}`);

  // ── Engagement ─────────────────────────────────────────────────────────────
  const likes: object[] = [];
  const confirmations: object[] = [];
  const comments: object[] = [];
  const notifications: object[] = [];

  postRows.forEach((post, i) => {
    const { row: draft, of, author, age } = drafts[i];
    const others = userIds.filter(id => id !== post.user_id);
    const created = new Date(post.created_at).getTime();
    const after = (maxHours: number) =>
      new Date(Math.min(now, created + rand() * maxHours * 3_600_000)).toISOString();

    for (const uid of sample(others, Math.floor(rand() * 5))) {
      likes.push({ user_id: uid, post_id: post.id });
    }
    if (draft.is_sighting) {
      for (const uid of sample(others, Math.floor(rand() * 3))) {
        confirmations.push({ user_id: uid, post_id: post.id });
      }
    }
    for (const uid of sample(others, Math.floor(rand() * 3.5))) {
      comments.push({ post_id: post.id, user_id: uid, text: pick(COMMENTS), created_at: after(18) });
    }

    // What notifyMatchingFarmers() would have written at report time.
    const animal = of ? animalByName.get(of) : undefined;
    if (animal && animal.owner_id !== post.user_id) {
      notifications.push({
        farmer_id: animal.owner_id,
        post_id: post.id,
        animal_id: animal.id,
        animal_name: animal.name,
        species: animal.species,
        reporter_name: nameOf(author),
        reporter_caption: draft.caption,
        reported_markings: draft.markings,
        location_label: draft.location_label,
        latitude: draft.latitude,
        longitude: draft.longitude,
        // Everything but the last few days has been seen.
        read: age > 3 || rand() < 0.3,
        created_at: post.created_at,
      });
    }
  });

  const follows: object[] = [];
  for (const a of userIds) {
    for (const b of sample(userIds.filter(id => id !== a), 2 + Math.floor(rand() * 3))) {
      follows.push({ follower_id: a, following_id: b });
    }
  }

  await insert(db, 'likes', likes);
  await insert(db, 'confirmations', confirmations);
  await insert(db, 'comments', comments);
  await insert(db, 'notifications', notifications);
  await insert(db, 'follows', follows);

  console.log(`Seeded demo data (last ${DAYS} days):
  ${PEOPLE.length} users, ${animalRows.length} animals, ${postRows.length} posts
  ${likes.length} likes, ${confirmations.length} confirmations, ${comments.length} comments
  ${notifications.length} farmer alerts, ${follows.length} follows

  farmers   ${farmers.map(k => k + DEMO_DOMAIN).join(', ')}
  reporters ${reporters.map(k => k + DEMO_DOMAIN).join(', ')}
  password  ${DEMO_PASSWORD}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  seedDemo().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
