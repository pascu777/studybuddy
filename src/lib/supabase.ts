import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { DEMO_MODE, env } from './env';
import { demoClient } from './demo/client';

/**
 * Client Supabase condiviso. Su nativo la sessione è persistita in AsyncStorage;
 * su web supabase-js usa localStorage di default.
 * NB: client non tipizzato — i tipi delle righe stanno in `@/types/database`.
 * In modalità demo (`EXPO_PUBLIC_DEMO_MODE=true`) viene usato un client finto
 * in memoria: nessuna rete, dataset di esempio.
 */
const realClient = createClient(
  env.supabaseUrl || 'http://localhost:54321',
  env.supabaseAnonKey || 'anon-key-non-configurata',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  },
);

export const supabase: any = DEMO_MODE ? demoClient : realClient;
