import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Post, User, RegisteredAnimal, FarmerNotification } from '@/lib/types';

// NOTE: comments are joined to `profiles` for the author name rather than
// reading a denormalised `comments.user_name`. The RN build selected
// `user_name`, but that column does not exist on the live database — the whole
// query failed with Postgres 42703, which is why the production feed was always
// empty. Joining also stops the stored name going stale when a user renames.
const POST_SELECT = `
  *,
  profiles!posts_user_id_fkey(name),
  likes(user_id),
  confirmations(user_id),
  comments(id, user_id, text, created_at, profiles!comments_user_id_fkey(name))
`;

/** Ported verbatim from store/app-store.tsx. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformPost(row: any): Post {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.name ?? 'Unknown',
    photo: row.photo_url ?? undefined,
    caption: row.caption ?? '',
    species: row.species,
    primaryColor: row.primary_color,
    markings: row.markings,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    likes: (row.likes ?? []).map((l: any) => l.user_id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    confirmations: (row.confirmations ?? []).map((c: any) => c.user_id),
    comments: (row.comments ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.profiles?.name ?? 'Unknown',
        text: c.text,
        timestamp: new Date(c.created_at).getTime(),
      }))
      .sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp),
    timestamp: new Date(row.created_at).getTime(),
    isSighting: row.is_sighting,
    sightingStatus: row.sighting_status,
  };
}

/** Feed. Runs on the server so the HTML contains real sightings for crawlers. */
export async function getPosts(limit = 100): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getPosts:', error.message);
    return [];
  }
  return (data ?? []).map(transformPost);
}

/** One sighting, for /post/[id] and its OG metadata. */
export async function getPost(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return transformPost(data);
}

export async function getPostsByUser(userId: string): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []).map(transformPost);
}

export async function getProfile(userId: string): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, name, is_farmer, farm_name')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    isFarmer: data.is_farmer,
    farmName: data.farm_name ?? undefined,
  };
}

/** The signed-in user's profile, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  return profile ? { ...profile, email: user.email } : null;
}

/** Animals owned by one farmer. Never fetches the whole table any more. */
export async function getAnimalsByOwner(ownerId: string): Promise<RegisteredAnimal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('animals')
    .select('*, profiles!animals_owner_id_fkey(name, farm_name)')
    .eq('owner_id', ownerId);

  return (data ?? []).map(a => ({
    id: a.id,
    ownerId: a.owner_id,
    ownerName: a.profiles?.name ?? 'Unknown',
    farmName: a.profiles?.farm_name ?? undefined,
    species: a.species,
    name: a.name,
    primaryColor: a.primary_color,
    markings: a.markings,
    tagNumber: a.tag_number ?? undefined,
  }));
}

export async function getNotifications(farmerId: string): Promise<FarmerNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  return (data ?? []).map(n => ({
    id: n.id,
    farmerId: n.farmer_id,
    animalId: n.animal_id,
    animalName: n.animal_name,
    species: n.species,
    reporterName: n.reporter_name,
    reporterCaption: n.reporter_caption,
    locationLabel: n.location_label ?? undefined,
    latitude: n.latitude ?? undefined,
    longitude: n.longitude ?? undefined,
    timestamp: new Date(n.created_at).getTime(),
    read: n.read,
  }));
}

/** Follower/following counts for a public profile. */
export async function getFollowCounts(userId: string) {
  const supabase = await createClient();
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

export async function isFollowing(followerId: string, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .match({ follower_id: followerId, following_id: targetId })
    .maybeSingle();
  return !!data;
}
