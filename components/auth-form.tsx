'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { SPECIES_LIST } from '@/lib/species';
import { login, signup, type SignupAnimal } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'signup' | 'animals';

export function AuthForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFarmer, setIsFarmer] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [animals, setAnimals] = useState<SignupAnimal[]>([]);
  const [sent, setSent] = useState(false);

  function doLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await login(form);
      if (r && !r.ok) toast.error(r.error ?? 'Could not sign in');
    });
  }

  function finishSignup(list: SignupAnimal[]) {
    startTransition(async () => {
      const r = await signup({ name, email, password, isFarmer, farmName, animals: list });
      if (!r.ok) { toast.error(r.error ?? 'Could not sign up'); return; }
      if (r.needsConfirmation) { setSent(true); return; }
      toast.success('Welcome to SheepFinder');
      router.push('/account');
      router.refresh();
    });
  }

  function continueSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (isFarmer && !farmName.trim()) { toast.error('Enter your farm name'); return; }
    // Farmers register animals before the account is created; everyone else
    // finishes here.
    if (isFarmer) setMode('animals');
    else finishSignup([]);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-5xl" aria-hidden>📬</p>
        <h2 className="mt-4 text-xl font-extrabold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-semibold">{email}</span>.
          Your profile{isFarmer && animals.length > 0 ? ' and registered animals' : ''} will be
          set up as soon as you confirm.
        </p>
      </div>
    );
  }

  if (mode === 'animals') {
    return (
      <AnimalStep
        animals={animals}
        setAnimals={setAnimals}
        pending={pending}
        onBack={() => setMode('signup')}
        onFinish={() => finishSignup(animals)}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(['login', 'signup'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cn(
              'rounded-full py-2 text-sm font-bold transition-colors',
              mode === m ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

      {mode === 'login' ? (
        <form onSubmit={doLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required className="mt-2" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-2" />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
      ) : (
        <form onSubmit={continueSignup} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)}
              autoComplete="name" required className="mt-2" />
          </div>
          <div>
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" required className="mt-2" />
          </div>
          <div>
            <Label htmlFor="signup-password">Password</Label>
            <Input id="signup-password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password" required minLength={6} className="mt-2" />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              checked={isFarmer}
              onChange={e => setIsFarmer(e.target.checked)}
              className="mt-1 size-4 accent-[var(--brand)]"
            />
            <span className="text-sm">
              <span className="block font-bold">I&apos;m a farmer</span>
              <span className="text-muted-foreground">
                Register your animals and get alerted when someone reports a match.
              </span>
            </span>
          </label>

          {isFarmer && (
            <div>
              <Label htmlFor="farmName">Farm name</Label>
              <Input id="farmName" value={farmName} onChange={e => setFarmName(e.target.value)}
                required className="mt-2" placeholder="e.g. Ballyroan Farm" />
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {isFarmer ? 'Next: register your animals' : pending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      )}
    </div>
  );
}

function AnimalStep({
  animals, setAnimals, pending, onBack, onFinish,
}: {
  animals: SignupAnimal[];
  setAnimals: (a: SignupAnimal[]) => void;
  pending: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [species, setSpecies] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [markings, setMarkings] = useState('');
  const [tagNumber, setTagNumber] = useState('');

  function add() {
    if (!species) { toast.error('Select an animal type'); return; }
    if (!name.trim()) { toast.error("Enter the animal's name"); return; }
    if (!color.trim()) { toast.error('Describe the primary colour'); return; }
    setAnimals([...animals, {
      species: species as SignupAnimal['species'],
      name: name.trim(),
      primaryColor: color.trim(),
      markings: markings.trim(),
      tagNumber: tagNumber.trim() || undefined,
    }]);
    setSpecies(''); setName(''); setColor(''); setMarkings(''); setTagNumber('');
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm font-bold text-brand hover:underline">
        ← Back
      </button>
      <div>
        <h2 className="text-xl font-extrabold">Register your animals</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll alert you the moment someone reports a sighting matching one of
          these — with their location.
        </p>
      </div>

      {animals.length > 0 && (
        <ul className="space-y-2">
          {animals.map((a, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
              <span aria-hidden>{SPECIES_LIST.find(s => s.value === a.species)?.emoji}</span>
              <span className="font-bold">{a.name}</span>
              <span className="text-muted-foreground">{a.primaryColor}</span>
              <button
                type="button"
                onClick={() => setAnimals(animals.filter((_, j) => j !== i))}
                className="ml-auto text-destructive hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="font-bold">Add an animal</p>
        <div className="flex flex-wrap gap-2">
          {SPECIES_LIST.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSpecies(s.value)}
              aria-pressed={species === s.value}
              className={cn(
                'rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                species === s.value ? 'border-brand bg-brand text-white' : 'border-border hover:border-brand/40'
              )}
            >
              <span aria-hidden>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
        <Input placeholder="Name (e.g. Dotty)" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Primary colour (e.g. white, brown)" value={color} onChange={e => setColor(e.target.value)} />
        <Textarea placeholder="Markings (e.g. blue ear tag #42)" value={markings} onChange={e => setMarkings(e.target.value)} />
        <Input placeholder="Tag/ear number (optional)" value={tagNumber} onChange={e => setTagNumber(e.target.value)} />
        <Button type="button" variant="outline" className="w-full" onClick={add}>+ Add to list</Button>
      </div>

      <Button size="lg" className="w-full" onClick={onFinish} disabled={pending}>
        {pending ? 'Creating account…' : animals.length ? 'Finish sign-up' : 'Skip for now'}
      </Button>
    </div>
  );
}
