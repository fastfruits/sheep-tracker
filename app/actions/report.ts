'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { notifyMatchingFarmers, type MatchedAnimal } from '@/lib/notify';
import { speciesLabel } from '@/lib/species';
import type { Species } from '@/lib/types';

export interface ReportResult {
  ok: boolean;
  error?: string;
  postId?: string;
  /** Names of registered animals this sighting might be. */
  matched?: MatchedAnimal[];
  /**
   * Whether the alert rows were actually written. `matched` can be non-empty
   * while this is false — the match was real but the write failed — and the UI
   * must not claim the farmer was notified in that case.
   */
  alertDelivered?: boolean;
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
  if (!primaryColor) return { ok: false, error: "Describe the animal's color." };

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
  // Lives in lib/notify.ts so it can be tested without a request context; see
  // the note at the top of that file.
  const alert = await notifyMatchingFarmers({
    postId: post.id,
    reporterId: user.id,
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

  return {
    ok: true,
    postId: post.id,
    matched: alert.matched,
    alertDelivered: alert.notified > 0,
  };
}
