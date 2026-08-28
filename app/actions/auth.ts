'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Species } from '@/lib/types';

export interface AuthResult { ok: boolean; error?: string; needsConfirmation?: boolean }

export interface SignupAnimal {
  species: Species;
  name: string;
  primaryColor: string;
  markings: string;
  tagNumber?: string;
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export async function login(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email) return { ok: false, error: 'Enter your email.' };
  if (!password) return { ok: false, error: 'Enter your password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/', 'layout');
  redirect('/feed');
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  isFarmer: boolean;
  farmName?: string;
  animals: SignupAnimal[];
}): Promise<AuthResult> {
  const { name, email, password, isFarmer, farmName, animals } = input;

  if (!name.trim()) return { ok: false, error: 'Enter your full name.' };
  if (!email.trim()) return { ok: false, error: 'Enter your email.' };
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  if (isFarmer && !farmName?.trim()) return { ok: false, error: 'Enter your farm name.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
      // Carried on the auth user until a session exists. With email
      // confirmation enabled there is no session at sign-up time, so a
      // profiles insert would run as the anon role and be refused by RLS
      // (auth.uid() = id). /auth/callback reads this back and writes the
      // profile once the user is actually signed in.
      data: {
        name: name.trim(),
        is_farmer: isFarmer,
        farm_name: isFarmer ? farmName?.trim() ?? null : null,
        pending_animals: isFarmer ? animals : [],
      },
    },
  });
  if (error) return { ok: false, error: error.message };

  const userId = data.user?.id;
  if (!userId) return { ok: false, error: 'Sign-up failed. Please try again.' };

  if (!data.session) return { ok: true, needsConfirmation: true };

  // Confirmation disabled: we already have a session, so write it now.
  await writeProfile(userId, { name, isFarmer, farmName, animals });
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Creates the profile row plus any registered animals. */
export async function writeProfile(
  userId: string,
  input: { name: string; isFarmer: boolean; farmName?: string; animals: SignupAnimal[] }
) {
  const supabase = await createClient();

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    name: input.name.trim(),
    is_farmer: input.isFarmer,
    farm_name: input.isFarmer ? input.farmName?.trim() ?? null : null,
  });
  if (error && !error.message.includes('duplicate')) {
    console.error('profile insert:', error.message);
    return { ok: false, error: error.message };
  }

  if (input.isFarmer && input.animals.length > 0) {
    const { error: animalError } = await supabase.from('animals').insert(
      input.animals.map(a => ({
        owner_id: userId,
        species: a.species,
        name: a.name,
        primary_color: a.primaryColor,
        markings: a.markings || null,
        tag_number: a.tagNumber || null,
      }))
    );
    if (animalError) console.error('animals insert:', animalError.message);
  }

  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
