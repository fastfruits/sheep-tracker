import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  'https://svqurbxxbplswkvtybtz.supabase.co',
  'sb_publishable_00TshND1ofI0ke6au1GV5Q_qKe4RP6L',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
