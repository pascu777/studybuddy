import { Redirect } from 'expo-router';

import { SplashPlaceholder } from '@/components/SplashPlaceholder';
import { adminRoutes } from '@/features/admin/routes';
import { useSession } from '@/features/auth/session-provider';
import { nextOnboardingStep } from '@/features/onboarding/steps';
import { useProfile } from '@/features/profile/hooks';

export default function Index() {
  const { session, initializing } = useSession();
  const { data: full, isLoading, isError } = useProfile();

  if (initializing) return <SplashPlaceholder />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (isLoading) return <SplashPlaceholder />;

  // Profilo non raggiungibile (es. Supabase non configurato): prosegui comunque.
  if (isError || !full) return <Redirect href="/(onboarding)/role" />;

  // Gli amministratori partono dal pannello admin (possono aprire l'app da lì).
  if (full.profile.is_admin) return <Redirect href={adminRoutes.root} />;

  if (!full.profile.onboarding_completed_at) {
    return <Redirect href={nextOnboardingStep(full)} />;
  }
  return <Redirect href="/(app)/home" />;
}
