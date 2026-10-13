'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface AvatarResult { ok: boolean; error?: string }

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// The uploader downsizes to 512px before sending, so a real avatar is tens of
// KB. This only guards against a hand-crafted request; the bucket enforces 2 MB.
const MAX_BYTES = 2 * 1024 * 1024;

/** Removes every file in the user's avatar folder. */
async function clearFolder(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.storage.from('avatars').list(userId);
  if (data?.length) {
    await supabase.storage.from('avatars').remove(data.map(f => `${userId}/${f.name}`));
  }
}

export async function uploadAvatar(formData: FormData): Promise<AvatarResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You need to be signed in.' };

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose an image.' };
  const ext = TYPES[file.type];
  if (!ext) return { ok: false, error: 'Use a JPEG, PNG or WebP image.' };
  if (file.size > MAX_BYTES) return { ok: false, error: 'Image must be under 2 MB.' };

  await clearFolder(supabase, user.id);

  // New filename on every upload so browsers and the image optimizer never
  // serve the previous picture from cache.
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error('avatar upload:', error.message);
    return { ok: false, error: 'Upload failed. Please try again.' };
  }

  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  if (updateError) {
    console.error('avatar save:', updateError.message);
    return { ok: false, error: 'Could not save your picture.' };
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You need to be signed in.' };

  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
  if (error) return { ok: false, error: 'Could not remove your picture.' };
  await clearFolder(supabase, user.id);

  revalidatePath('/', 'layout');
  return { ok: true };
}
