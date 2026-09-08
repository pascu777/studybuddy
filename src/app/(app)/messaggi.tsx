import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, EmptyState, Screen, Text } from '@/components';
import { useConversations } from '@/features/chat/hooks';
import { relativeDay } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export default function MessaggiScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: conversations = [], isLoading } = useConversations();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title">Messaggi</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={28} color={theme.primary} />}
          title="Nessuna conversazione"
          description="Apri la scheda di un tutor e tocca “Scrivi” per iniziare a chattare."
        />
      ) : (
        <View style={styles.list}>
          {conversations.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: c.id } })}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surfaceAlt }]}
            >
              <Avatar
                uri={c.counterpart_avatar_url}
                name={`${c.counterpart_first_name} ${c.counterpart_last_name}`}
                size={46}
              />
              <View style={styles.rowText}>
                <View style={styles.rowTop}>
                  <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                    {c.counterpart_first_name} {c.counterpart_last_name}
                  </Text>
                  <Text variant="caption" tone="soft">
                    {relativeDay(c.last_at)}
                  </Text>
                </View>
                <View style={styles.rowTop}>
                  <Text
                    variant="caption"
                    tone={c.unread ? 'default' : 'soft'}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {c.last_body || 'Nessun messaggio'}
                  </Text>
                  {c.unread ? (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                      <Text variant="caption" color={theme.primaryText} style={styles.badgeText}>
                        {c.unread}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, marginBottom: spacing.md },
  loader: { marginVertical: spacing.xxxl },
  list: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.sm, borderRadius: radius.md },
  rowText: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { minWidth: 18, height: 18, borderRadius: 999, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 14 },
});
