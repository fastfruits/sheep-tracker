'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchAnimals } from '@/lib/matching';
import { speciesLabel } from '@/lib/species';
import type { RegisteredAnimal, Species } from '@/lib/types';

export interface ReportResult {
  ok: boolean;
  error?: string;
  postId?: string;
  /** Names of registered animals this sighting might be. */
  matched?: { id: string; name: string; ownerName: string; farmName?: string }[];
}

/** Uploads to the `photos` bucket as the signed-in user, so storage RLS applies. */
async function uploadPhoto(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const supabase = await createClient();
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { data, error } = await supabase.storage
    .from('photos')
    .upload(path, file, { contentType: file.type || `image/${safeExt}`, upsert: false });

  if (error) {
    console.error('photo upload:', error.message);
    return null;
  }
  return supabase.storage.from('photos').getPublicUrl(data.path).data.publicUrl;
}

export async function reportSighting(formData: FormData): Promise<ReportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You need to be signed in to report a sighting.' };

  const species = String(formData.get('species') ?? '') as Species;
  const primaryColor = String(formData.get('primaryColor') ?? '').trim();
  const markings = String(formData.get('markings') ?? '').trim();
  const caption = String(formData.get('caption') ?? '').trim();
  const locationLabel = String(formData.get('locationLabel') ?? '').trim();
  const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : null;
  const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : null;

  if (!species) return { ok: false, error: 'Choose the type of animal.' };
  if (!primaryColor) return { ok: false, error: "Describe the animal's colour." };

  const photo = formData.get('photo');
  const photoUrl = photo instanceof File ? await uploadPhoto(photo) : null;

  const { data: profile } = await supabase
    .from('profiles').select('name').eq('id', user.id).maybeSingle();
  const reporterName = profile?.name ?? 'Someone';

  const finalCaption =
    caption ||
    `Spotted a ${speciesLabel(species)} near ${locationLabel || 'an unknown location'}`;

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      caption: finalCaption,
      species,
      primary_color: primaryColor,
      markings: markings || null,
      location_label: locationLabel || null,
      latitude,
      longitude,
      photo_url: photoUrl,
      is_sighting: true,
      sighting_status: 'open',
    })
    .select('id')
    .single();

  if (error || !post) {
    console.error('reportSighting:', error?.message);
    return { ok: false, error: 'Could not save the report. Please try again.' };
  }

  // ── Match against every registered animal, server-side ──
  // This is why `animals` no longer needs a public read policy: matching used
  // to happen in the browser, which required shipping every farmer's inventory
  // to every visitor. The admin client reads across owners; the user's own
  // session cannot.
  const matched = await notifyMatchingFarmers({
    postId: post.id,
    species,
    primaryColor,
    reporterName,
    caption: finalCaption,
    locationLabel: locationLabel || null,
    latitude,
    longitude,
  });

  revalidatePath('/feed');
  revalidatePath('/account');

  return { ok: true, postId: post.id, matched };
}

async function notifyMatchingFarmers(input: {
  postId: string;
  species: Species;
  primaryColor: string;
  reporterName: string;
  caption: string;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    // Without the service-role key we cannot match or notify. The sighting is
    // still saved and visible in the feed; only the farmer alert is skipped.
    console.error('matching skipped:', (e as Error).message);
    return [];
  }

  const { data: rows } = await admin
    .from('animals')
    .select('*, profiles!animals_owner_id_fkey(name, farm_name)')
    .eq('species', input.species);

  const animals: RegisteredAnimal[] = (rows ?? []).map(a => ({
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

  const matches = matchAnimals(
    { species: input.species, primaryColor: input.primaryColor },
    animals
  );
  if (matches.length === 0) return [];

  const { error } = await admin.from('notifications').insert(
    matches.map(animal => ({
      farmer_id: animal.ownerId,
      post_id: input.postId,
      animal_id: animal.id,
      animal_name: animal.name,
      species: animal.species,
      reporter_name: input.reporterName,
      reporter_caption: input.caption,
      location_label: input.locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
    }))
  );
  if (error) console.error('notifications insert:', error.message);

  return matches.map(m => ({
    id: m.id,
    name: m.name,
    ownerName: m.ownerName,
    farmName: m.farmName,
  }));
}
