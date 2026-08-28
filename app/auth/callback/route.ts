import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeProfile } from '@/app/actions/auth';
import type { SignupAnimal } from '@/app/actions/auth';

/**
 * Exchanges the email-confirmation code for a session, then materialises the
 * profile from the metadata stashed at sign-up.
 *
 * This URL must be added to Supabase → Authentication → URL Configuration →
 * Redirect URLs, or Supabase refuses to redirect here and the confirmation
 * link dead-ends.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('auth callback:', error.message);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  // Now that a session exists, RLS lets the user create their own profile row.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('id', user.id).maybeSingle();

    if (!existing) {
      const meta = user.user_metadata ?? {};
      await writeProfile(user.id, {
        name: meta.name ?? user.email?.split('@')[0] ?? 'New user',
        isFarmer: !!meta.is_farmer,
        farmName: meta.farm_name ?? undefined,
        animals: (meta.pending_animals ?? []) as SignupAnimal[],
      });
    }
  }

  return NextResponse.redirect(`${origin}${next}?confirmed=1`);
}
