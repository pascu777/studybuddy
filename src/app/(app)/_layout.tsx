import { Redirect, Tabs } from 'expo-router';
import { CalendarDays, House, MessageCircle, UserRound } from 'lucide-react-native';
import { Platform, View } from 'react-native';

import { SplashPlaceholder } from '@/components/SplashPlaceholder';
import { useSession } from '@/features/auth/session-provider';
import { useUnreadMessages } from '@/features/chat/hooks';
import { useRegisterPushToken } from '@/features/notifications/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

export default function AppLayout() {
  const theme = useTheme();
  const { session, initializing } = useSession();
  const { data: full, isLoading } = useProfile();
  const unread = useUnreadMessages();
  useRegisterPushToken();

  if (initializing || isLoading) return <SplashPlaceholder />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!full || !full.profile.onboarding_completed_at) return <Redirect href="/" />;

  const dot = (color: string) => (
    <View
      style={{
        position: 'absolute',
        top: -2,
        right: -6,
        minWidth: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSoft,
        sceneStyle: { backgroundColor: theme.bg },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="lezioni"
        options={{
          title: 'Lezioni',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messaggi"
        options={{
          title: 'Messaggi',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MessageCircle size={size} color={color} />
              {unread > 0 ? dot(theme.primary) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <UserRound size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="profilo" options={{ href: null }} />
      <Tabs.Screen name="notifiche" options={{ href: null }} />
      <Tabs.Screen name="preferenze" options={{ href: null }} />
      <Tabs.Screen name="cerca" options={{ href: null }} />
      <Tabs.Screen name="prenota" options={{ href: null }} />
      <Tabs.Screen name="disponibilita" options={{ href: null }} />
      <Tabs.Screen name="tutor/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="gruppi" options={{ href: null }} />
      <Tabs.Screen name="gruppi/[id]" options={{ href: null }} />
      <Tabs.Screen name="gruppi/nuovo" options={{ href: null }} />
      <Tabs.Screen name="emergenza" options={{ href: null }} />
      <Tabs.Screen name="compensi" options={{ href: null }} />
      <Tabs.Screen name="notifiche-centro" options={{ href: null }} />
    </Tabs>
  );
}
