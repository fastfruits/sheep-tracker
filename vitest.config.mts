import { defineConfig } from 'vitest/config';

// `.mts` rather than `.ts` because tsconfig.json's `include` already covers
// **/*.mts, so this file is typechecked by `npm run typecheck` for free.
export default defineConfig({
  resolve: {
    // tsconfig.json maps `@/*` to the repo root; without this every
    // `@/lib/...` import in the code under test fails to resolve. Vite
    // resolves these natively now, so no vite-tsconfig-paths plugin.
    tsconfigPaths: true,

    alias: {
      // The real package throws on import outside an RSC graph (see the stub).
      'server-only': new URL('./tests/helpers/stubs/server-only.ts', import.meta.url).pathname,
    },
  },

  test: {
    environment: 'node',

    // Explicit imports from 'vitest' instead of globals, which keeps
    // tsconfig.json free of a `types: ["vitest/globals"]` entry.
    globals: false,

    globalSetup: ['./tests/helpers/global-setup.ts'],
    setupFiles: ['./tests/helpers/setup.ts'],

    // Playwright owns tests/e2e.
    include: ['tests/{unit,integration}/**/*.test.ts'],

    // Integration tests do real Postgres round trips, and admin.createUser is
    // the slowest call in the suite.
    testTimeout: 20_000,
    hookTimeout: 30_000,

    // Safe to parallelise: every fixture mints a random email and every
    // assertion is scoped by farmer_id / post_id, so tests never share rows.
    fileParallelism: true,
  },
});
