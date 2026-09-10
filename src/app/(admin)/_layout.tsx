import { Redirect, Stack } from 'expo-router';

import { SplashPlaceholder } from '@/components/SplashPlaceholder';
import { useIsAdmin } from '@/features/admin/hooks';
import { useSession } from '@/features/auth/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useTheme } from '@/theme/theme-provider';

export default function AdminLayout() {
  const theme = useTheme();
  const { session, initializing } = useSession();
  const { isLoading } = useProfile();
  const { isAdmin } = useIsAdmin();

  if (initializing || isLoading) return <SplashPlaceholder />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!isAdmin) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    />
  );
}
