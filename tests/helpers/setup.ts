import { assertLocalSupabase } from './guard';

/**
 * Runs once per test worker. globalSetup has already overwritten the Supabase
 * connection details from the running local stack, and workers inherit that
 * env — but if they ever stop inheriting it, the values would silently fall
 * back to `.env`, which points at the hosted project. Re-asserting here makes
 * that failure mode loud instead of destructive.
 */
assertLocalSupabase();
