import Link from 'next/link';

/** TODO: replace with the real support address before launch. */
const CONTACT_EMAIL = 'nicholasahenry06@gmail.com';
const REPO_URL = 'https://github.com/fastfruits/sheep-tracker';

/**
 * Site links are duplicated from `LINKS` in `nav-links.tsx` rather than shared:
 * the nav needs client-side pathname matching, the footer is static. Keep the
 * labels in step if either list changes.
 */
const COLUMNS = [
  {
    heading: 'Site',
    links: [
      { href: '/', label: 'Report a sighting' },
      { href: '/feed', label: 'Community' },
      { href: '/account', label: 'Account' },
    ],
  },
  {
    heading: 'About',
    links: [
      { href: '/about', label: 'About SheepFinder' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

const linkClass =
  'inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-brand md:min-h-0';

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card sm:mt-16">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
              <span aria-hidden className="text-lg sm:text-xl">🐑</span>
              <span className="text-base text-brand sm:text-lg">SheepFinder</span>
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Reuniting animals with their owners.
            </p>
          </div>

          <nav aria-label="Footer" className="grid gap-6 sm:col-span-2 sm:grid-cols-3 sm:gap-8 md:col-span-3">
            {COLUMNS.map(column => (
              <div key={column.heading}>
                <h2 className="text-sm font-semibold">{column.heading}</h2>
                <ul className="mt-2 space-y-1 sm:mt-3 sm:space-y-2">
                  {column.links.map(link => (
                    <li key={link.href}>
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h2 className="text-sm font-semibold">Contact</h2>
              <ul className="mt-2 space-y-1 sm:mt-3 sm:space-y-2">
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground sm:mt-10 sm:pt-6">
          {/* Static routes bake this in at build time, which is fine for a copyright line. */}
          <p>&copy; {new Date().getFullYear()} SheepFinder. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
