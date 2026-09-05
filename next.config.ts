import type { NextConfig } from 'next';

// Post photos are served from Supabase Storage, so next/image has to be told
// the host is allowed. Derived from the env var rather than hardcoded, because
// the host differs per environment — the local CLI stack serves them from
// http://127.0.0.1:54321, and a literal production hostname makes every photo
// 400 there. One source of truth covers local, preview and production.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const storagePattern = supabaseUrl
  ? (() => {
      const { protocol, hostname, port } = new URL(supabaseUrl);
      return [
        {
          protocol: protocol.replace(':', '') as 'http' | 'https',
          hostname,
          ...(port ? { port } : {}),
          pathname: '/storage/v1/object/public/**',
        },
      ];
    })()
  : [];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: storagePattern,
  },
};

export default nextConfig;
