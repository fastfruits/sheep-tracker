import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/posts';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in or create a SheepFinder account to register animals and receive sighting alerts.',
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/account');

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <p className="text-5xl" aria-hidden>🐑</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">SheepFinder</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reuniting animals with their owners</p>
      </div>
      <AuthForm />
    </div>
  );
}
