import { Redirect, Stack } from 'expo-router';

import { SplashPlaceholder } from '@/components/SplashPlaceholder';
import { useSession } from '@/features/auth/session-provider';

export default function AuthLayout() {
  const { session, initializing } = useSession();

  if (initializing) return <SplashPlaceholder />;
  // Se già autenticato, l'instradamento lo gestisce la root.
  if (session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
