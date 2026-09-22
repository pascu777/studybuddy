import { useMutation, useQueryClient } from '@tanstack/react-query';

import { APP_SCHEME } from '@/constants/app';
import { isWeb } from '@/lib/platform';
import { supabase } from '@/lib/supabase';

function redirectTo(path: string) {
  if (isWeb && typeof window !== 'undefined') {
    return `${window.location.origin}/${path}`;
  }
  return `${APP_SCHEME}://${path}`;
}

/** Traduce i messaggi d'errore più comuni di Supabase Auth in italiano. */
export function authErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(msg)) return 'Email o password non corretti.';
  if (/email not confirmed/i.test(msg)) return 'Devi prima confermare la tua email.';
  if (/user already registered/i.test(msg)) return 'Esiste già un account con questa email.';
  if (/password should be at least/i.test(msg)) return 'La password deve avere almeno 6 caratteri.';
  if (/rate limit|too many requests/i.test(msg)) return 'Troppi tentativi, riprova tra poco.';
  if (/network/i.test(msg)) return 'Problema di connessione. Controlla la rete e riprova.';
  return msg || 'Qualcosa è andato storto. Riprova.';
}

export function useSignUp() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { first_name: input.firstName.trim(), last_name: input.lastName.trim() },
          emailRedirectTo: redirectTo('sign-in'),
        },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
  });
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => qc.clear(),
  });
}

export function useSendPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectTo('reset-password'),
      });
      if (error) throw error;
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}
