'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { SPECIES_LIST, speciesInfo } from '@/lib/species';
import { registerAnimal, deleteAnimal } from '@/app/actions/posts';
import type { RegisteredAnimal, Species } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function AnimalManager({ animals }: { animals: RegisteredAnimal[] }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [species, setSpecies] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [markings, setMarkings] = useState('');
  const [tagNumber, setTagNumber] = useState('');

  function submit() {
    startTransition(async () => {
      const r = await registerAnimal({
        species: species as Species, name, primaryColor: color, markings, tagNumber,
      });
      if (!r.ok) { toast.error(r.error ?? 'Could not add the animal'); return; }
      toast.success(`${name.trim()} registered`);
      setSpecies(''); setName(''); setColor(''); setMarkings(''); setTagNumber('');
      setOpen(false);
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {animals.length === 0 && !open && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No animals registered yet.
        </p>
      )}

      <ul className="space-y-2">
        {animals.map(a => (
          <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="text-xl" aria-hidden>{speciesInfo(a.species)?.emoji ?? '🐾'}</span>
            <div className="min-w-0">
              <p className="font-bold">{a.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {a.primaryColor}{a.markings ? ` · ${a.markings}` : ''}{a.tagNumber ? ` · #${a.tagNumber}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="ml-auto text-sm text-destructive hover:underline"
              onClick={() => {
                startTransition(async () => {
                  const r = await deleteAnimal(a.id);
                  if (!r.ok) toast.error(r.error ?? 'Could not remove');
                });
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
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
          <Input placeholder="Primary color" value={color} onChange={e => setColor(e.target.value)} />
          <Textarea placeholder="Markings (e.g. blue ear tag #42)" value={markings} onChange={e => setMarkings(e.target.value)} />
          <Input placeholder="Tag/ear number (optional)" value={tagNumber} onChange={e => setTagNumber(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={pending}>{pending ? 'Saving…' : 'Register animal'}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          + Register an animal
        </Button>
      )}
    </div>
  );
}
