import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';
import { Toaster } from '@/components/ui/sonner';

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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
