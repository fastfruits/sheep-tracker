import { visionScript } from '@/lib/vision';

/**
 * Applies the saved color-blind preference before the browser paints so the
 * page never flashes the default palette. Rendered as `text/plain` on the
 * client because React warns about rendering `<script>` tags there and the
 * script only needs to run on the initial HTML parse.
 */
export function VisionScript() {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: visionScript }}
    />
  );
}
