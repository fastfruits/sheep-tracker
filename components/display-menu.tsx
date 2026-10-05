'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Eye, Monitor, Moon, Sun } from 'lucide-react';

import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VISION_CVD, VISION_STORAGE_KEY } from '@/lib/vision';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Match device', icon: Monitor },
];

// The <html> attribute is the source of truth (VisionScript sets it pre-paint),
// so subscribe to it directly rather than mirroring it in React state.
function subscribeVision(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-vision'] });
  return () => observer.disconnect();
}
const getVision = () => document.documentElement.dataset.vision === VISION_CVD;
const getServerVision = () => false;

function setVision(on: boolean) {
  const root = document.documentElement;
  if (on) root.dataset.vision = VISION_CVD;
  else delete root.dataset.vision;
  try {
    if (on) localStorage.setItem(VISION_STORAGE_KEY, VISION_CVD);
    else localStorage.removeItem(VISION_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): the setting still applies for this visit.
  }
}

export function DisplayMenu() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const colorBlind = useSyncExternalStore(subscribeVision, getVision, getServerVision);

  // The trigger icon swaps via the `dark:` variant rather than resolvedTheme,
  // which is unknown during SSR and would cause a hydration mismatch.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-brand focus-visible:outline-2 focus-visible:outline-ring md:size-9"
        aria-label="Display settings"
      >
        <Sun className="size-[18px] dark:hidden" aria-hidden />
        <Moon className="hidden size-[18px] dark:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
          {THEMES.map(t => (
            <DropdownMenuRadioItem key={t.value} value={t.value} className="min-h-11 md:min-h-8">
              <t.icon aria-hidden />
              {t.label}
              {t.value === 'system' && theme === 'system' && resolvedTheme && (
                <span className="text-xs text-muted-foreground">({resolvedTheme})</span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Accessibility</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={colorBlind}
          onCheckedChange={on => setVision(on === true)}
          onSelect={e => e.preventDefault()}
          className="min-h-11 md:min-h-8"
        >
          <Eye aria-hidden />
          Color-blind friendly
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
