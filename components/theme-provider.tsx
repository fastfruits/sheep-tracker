'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Light / dark / system theme. next-themes injects its own pre-paint script
 * and toggles the `.dark` class on <html>, which `globals.css` keys off.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
