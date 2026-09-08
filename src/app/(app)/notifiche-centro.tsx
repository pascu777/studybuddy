import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState, NotificationItem, Screen, StepHeader } from '@/components';
import { useMarkNotificationsRead, useNotifications } from '@/features/notifications/hooks';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

export default function NotificheCentroScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: items = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    const t = setTimeout(() => markRead.mutate(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen scroll>
      <StepHeader title="Notifiche" onBack={() => router.back()} />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} color={theme.primary} />}
          title="Nessuna notifica"
          description="Qui arrivano richieste, conferme, messaggi e proposte per le lezioni d'emergenza."
        />
      ) : (
        <View style={styles.list}>
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              onPress={() => {
                if (n.link) router.push(n.link as never);
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.xxxl },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
});
