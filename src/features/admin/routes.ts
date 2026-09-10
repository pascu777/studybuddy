import type { Href } from 'expo-router';

/**
 * Percorsi del gruppo `(admin)`. Sono castati a `Href` perché l'unione dei
 * typed-route di expo-router (`.expo/types/router.d.ts`) si rigenera solo con
 * `expo start`, non con `expo export`. Dopo il primo `expo start` i percorsi
 * reali combaciano comunque.
 */
export const adminRoutes = {
  root: '/(admin)' as unknown as Href,
  verifiche: '/(admin)/verifiche' as unknown as Href,
  utenti: '/(admin)/utenti' as unknown as Href,
};
