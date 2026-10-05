import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { VisionScript } from '@/components/vision-script';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const SITE = 'SheepFinder';
const DESCRIPTION =
  'Spotted an escaped sheep, cow or goat? Report it in seconds and the farmer who owns it is alerted, with your location.';

export const metadata: Metadata = {
  title: { default: `${SITE} — report escaped livestock`, template: `%s · ${SITE}` },
  description: DESCRIPTION,
  openGraph: { siteName: SITE, type: 'website', description: DESCRIPTION },
  twitter: { card: 'summary_large_image' },
};

/**
 * Explicit so mobile browser chrome picks up the page color. Follows the OS
 * scheme; a manual theme override can't be known here at request time. No
 * `viewport-fit: cover`: there is no fixed bottom UI, so it would only add
 * safe-area obligations for no gain.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F2' },
    { media: '(prefers-color-scheme: dark)', color: '#121410' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme and vision scripts set attributes on <html> before hydration.
      suppressHydrationWarning
    >
      <head>
        <VisionScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
