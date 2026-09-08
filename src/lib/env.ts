/**
 * Variabili d'ambiente pubbliche (prefisso EXPO_PUBLIC_, inlinate a build time).
 * Copiare `.env.example` in `.env` e compilare i valori.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Modalità demo: l'app gira su un dataset in memoria, senza Supabase. */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

if (!isSupabaseConfigured && !DEMO_MODE && __DEV__) {
  console.warn(
    '[StudyBuddy] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY mancanti. ' +
      'Copia .env.example in .env, oppure usa la modalità demo: EXPO_PUBLIC_DEMO_MODE=true.',
  );
}

export const env = {
  supabaseUrl: supabaseUrl ?? '',
  supabaseAnonKey: supabaseAnonKey ?? '',
  /** In sviluppo salta la schermata "conferma la mail" per testare più in fretta. */
  skipEmailConfirmation: process.env.EXPO_PUBLIC_SKIP_EMAIL_CONFIRMATION === 'true',
  demoMode: DEMO_MODE,
};
