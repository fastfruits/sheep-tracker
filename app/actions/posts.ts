'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Species } from '@/lib/types';
import { formatMarkings, parseMarkings, type Marking } from '@/lib/markings';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Toggle a like. RLS restricts writes to the acting user's own row. */
export async function toggleLike(postId: string, liked: boolean) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Sign in to like a post.' };

  const { error } = liked
    ? await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id })
    : await supabase.from('likes').insert({ post_id: postId, user_id: user.id });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/feed');
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

/** "I saw this too" on an escaped-animal sighting. */
export async function toggleConfirmation(postId: string, confirmed: boolean) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Sign in to confirm a sighting.' };

  const { error } = confirmed
    ? await supabase.from('confirmations').delete().match({ post_id: postId, user_id: user.id })
    : await supabase.from('confirmations').insert({ post_id: postId, user_id: user.id });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/feed');
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function addComment(postId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Write something first.' };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Sign in to comment.' };

  // No user_name column on this table — the display name is read back by
  // joining profiles. The RN build wrote user_name and silently failed.
  const { error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: user.id, text: trimmed });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/feed');
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

/** Close a sighting. RLS allows updates only by the post's author. */
export async function markReunited(postId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Sign in first.' };

  const { error } = await supabase
    .from('posts')
    .update({ sighting_status: 'resolved' })
    .eq('id', postId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/feed');
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function toggleFollow(targetId: string, following: boolean) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Sign in to follow people.' };
  if (user.id === targetId) return { ok: false, error: 'You cannot follow yourself.' };

  const { error } = following
    ? await supabase.from('follows').delete().match({ follower_id: user.id, following_id: targetId })
    : await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/u/${targetId}`);
  return { ok: true };
}

export async function registerAnimal(input: {
  species: Species;
  name: string;
  primaryColor: string;
  /** Structured markings; re-validated server-side against the vocabulary. */
  markings: Marking[];
  markingNotes?: string;
  tagNumber?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Sign in first.' };
  if (!input.species) return { ok: false, error: 'Select an animal type.' };
  if (!input.name.trim()) return { ok: false, error: "Enter the animal's name." };
  if (!input.primaryColor.trim()) return { ok: false, error: 'Describe the primary color.' };

  const markingDetails = parseMarkings(input.markings);
  const markingNotes = input.markingNotes?.trim() ?? '';

  const { error } = await supabase.from('animals').insert({
    owner_id: user.id,
    species: input.species,
    name: input.name.trim(),
    primary_color: input.primaryColor.trim(),
    markings: formatMarkings(markingDetails, markingNotes) || null,
    markings_details: markingDetails,
    marking_notes: markingNotes || null,
    tag_number: input.tagNumber?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/account');
  return { ok: true };
}

export async function deleteAnimal(animalId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Sign in first.' };

  const { error } = await supabase.from('animals').delete().eq('id', animalId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/account');
  return { ok: true };
}

/** Marks the signed-in farmer's alerts as read. */
export async function markNotificationsRead() {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false };

  await supabase.from('notifications').update({ read: true }).eq('farmer_id', user.id);
  revalidatePath('/account');
  revalidatePath('/', 'layout');
  return { ok: true };
}
