import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill them in (and set them in your host\'s ' +
      'environment variables when deploying).'
  );
}

const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // On web, let supabase-js use localStorage directly rather than routing
    // through the AsyncStorage shim.
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Required on web: email-confirmation and OAuth links come back as URL
    // fragments, and without this the session is never established.
    detectSessionInUrl: isWeb,
  },
});

/** Where Supabase should send the user after confirming their email. */
export function authRedirectTo(): string | undefined {
  if (isWeb && typeof window !== 'undefined') return window.location.origin;
  return undefined;
}
