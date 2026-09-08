import { CalendarClock, ChevronRight, Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { formatDayShort, formatTime } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import type { GroupRow } from '@/types/database';
import { Card } from './Card';
import { Text } from './Text';

export function GroupCard({ group, onPress }: { group: GroupRow; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {group.name}
          </Text>
          <View style={styles.meta}>
            {group.subject_name ? (
              <Text variant="caption" tone="soft">
                {group.subject_name}
              </Text>
            ) : null}
            <View style={styles.metaItem}>
              <Users size={12} color={theme.textSoft} />
              <Text variant="caption" tone="soft">
                {group.members_count}
              </Text>
            </View>
            {group.is_owner ? (
              <View style={[styles.tag, { backgroundColor: theme.primarySoft }]}>
                <Text variant="caption" color={theme.onPrimarySoft}>
                  Tua classe
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <ChevronRight size={18} color={theme.textSoft} />
      </View>

      {group.next_session_at ? (
        <View style={[styles.next, { backgroundColor: theme.surfaceAlt }]}>
          <CalendarClock size={13} color={theme.primary} />
          <Text variant="caption" tone="soft">
            {group.next_session_topic || 'Prossima sessione'} · {formatDayShort(group.next_session_at)},{' '}
            {formatTime(group.next_session_at)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 10,
  },
});
