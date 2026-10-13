import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * iOS home-screen icon. iOS ignores SVG favicons, so this renders app/icon.svg
 * to a 180×180 PNG at build time — one drawing, two formats. iOS rounds the
 * corners itself, so the background is a full square rather than the SVG's
 * rounded rect.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), 'app/icon.svg'), 'utf8');
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#1B4D0E' }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={src} width={180} height={180} />
      </div>
    ),
    size
  );
}
