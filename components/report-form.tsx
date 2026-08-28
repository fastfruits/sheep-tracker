'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { SPECIES_LIST } from '@/lib/species';
import { reportSighting, type ReportResult } from '@/app/actions/report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function ReportForm({ signedIn }: { signedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [species, setSpecies] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      toast.error('This browser cannot share your location');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const d = await res.json();
          const parts = [d.locality, d.principalSubdivision, d.city || d.countryName]
            .filter(Boolean)
            .filter((p: string, i: number, a: string[]) => p !== a[i - 1]);
          if (parts.length) setLocationLabel(parts.join(', '));
        } catch {
          // Coordinates are saved regardless; the label is optional.
        }
        setLocating(false);
      },
      () => {
        toast.error('Could not get your location', { description: 'Type it in instead.' });
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set('species', species);
    if (photo) form.set('photo', photo);
    if (coords) {
      form.set('latitude', String(coords.latitude));
      form.set('longitude', String(coords.longitude));
    }

    startTransition(async () => {
      const r = await reportSighting(form);
      if (!r.ok) {
        toast.error(r.error ?? 'Something went wrong');
        return;
      }
      setResult(r);
    });
  }

  if (result?.ok) {
    return (
      <div className="py-10 text-center">
        <p className="text-5xl" aria-hidden>✅</p>
        <h2 className="mt-4 text-2xl font-extrabold">Report submitted</h2>
        <p className="mt-2 text-muted-foreground">
          Your sighting is now in the community feed.
        </p>

        {result.matched && result.matched.length > 0 && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border-2 border-amber-note-border bg-amber-note-bg p-5 text-left">
            <p className="font-extrabold">🔔 Farmer notified!</p>
            <ul className="mt-2 space-y-2 text-sm">
              {result.matched.map(m => (
                <li key={m.id}>
                  <span className="font-bold">{m.name}</span> — {m.ownerName}
                  {m.farmName ? ` · ${m.farmName}` : ''} has been sent your report
                  {locationLabel ? ` and your location (${locationLabel})` : ''}.
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          {result.postId && (
            <Button asChild>
              <Link href={`/post/${result.postId}`}>View the sighting</Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => { setResult(null); setPhoto(null); setPreview(null); setSpecies(''); setCoords(null); setLocationLabel(''); }}>
            Report another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {!signedIn && (
        <p className="rounded-xl border border-amber-note-border bg-amber-note-bg p-4 text-sm">
          You need an account to report a sighting, so farmers know who saw their
          animal.{' '}
          <Link href="/login" className="font-bold text-brand underline">
            Sign in or create one
          </Link>
          .
        </p>
      )}

      <div>
        <Label htmlFor="photo" className="mb-2 block">Photo</Label>
        <label
          htmlFor="photo"
          className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card transition-colors hover:border-brand"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected photo" className="size-full object-cover" />
          ) : (
            <span className="text-center text-sm text-muted-foreground">
              <span className="block text-4xl" aria-hidden>📷</span>
              <span className="mt-2 block font-bold text-foreground">Add a photo</span>
              Camera or photo library
            </span>
          )}
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onPhoto}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">
          Animal type <span className="text-destructive">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SPECIES_LIST.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSpecies(s.value)}
              aria-pressed={species === s.value}
              className={cn(
                'rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors',
                species === s.value
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-card hover:border-brand/40'
              )}
            >
              <span aria-hidden>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="primaryColor">
          Primary colour <span className="text-destructive">*</span>
        </Label>
        <Input id="primaryColor" name="primaryColor" required className="mt-2"
          placeholder="e.g. white, brown, black and white" />
      </div>

      <div>
        <Label htmlFor="markings">Distinguishing markings</Label>
        <Textarea id="markings" name="markings" className="mt-2"
          placeholder="e.g. blue paint on back, yellow ear tag #7, red collar" />
      </div>

      <div>
        <Label htmlFor="caption">Additional notes</Label>
        <Textarea id="caption" name="caption" className="mt-2"
          placeholder="Condition, behaviour, nearby landmarks…" />
      </div>

      <div>
        <Label htmlFor="locationLabel">Location</Label>
        <Button
          type="button"
          variant={coords ? 'default' : 'outline'}
          onClick={detectLocation}
          disabled={locating}
          className="mt-2 w-full"
        >
          {locating ? 'Locating…' : coords ? '📍 Location detected' : '📍 Detect my location'}
        </Button>
        <Input
          id="locationLabel"
          name="locationLabel"
          className="mt-2"
          placeholder="Or type a road, village, or landmark"
          value={locationLabel}
          onChange={e => setLocationLabel(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending || !signedIn}>
        {pending ? 'Submitting…' : 'Submit report'}
      </Button>
    </form>
  );
}
