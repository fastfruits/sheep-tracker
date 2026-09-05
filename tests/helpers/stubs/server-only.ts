/**
 * Stand-in for the real `server-only` package, which throws on import outside
 * an RSC graph by design. `lib/data/*` imports it as a guard against being
 * pulled into a client bundle; under Vitest that guard is what we need to step
 * around, so vitest.config.mts aliases the package to this empty module.
 */
export {};
