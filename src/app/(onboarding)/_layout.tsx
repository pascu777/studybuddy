import { Redirect, Stack } from 'expo-router';

import { SplashPlaceholder } from '@/components/SplashPlaceholder';
import { useSession } from '@/features/auth/session-provider';

export default function OnboardingLayout() {
  const { session, initializing } = useSession();

  if (initializing) return <SplashPlaceholder />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    />
  );
}
