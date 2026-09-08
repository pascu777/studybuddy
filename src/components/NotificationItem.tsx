import {
  Bell,
  CalendarCheck,
  CalendarX,
  MessageCircle,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { relativeDay } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import type { NotificationRow } from '@/types/database';
import { Text } from './Text';

const ICON: Record<string, LucideIcon> = {
  booking_request: CalendarCheck,
  booking_confirmed: CalendarCheck,
  booking_declined: CalendarX,
  message: MessageCircle,
  group_session: Users,
  emergency_offer: Zap,
};

export function NotificationItem({
  n,
  onPress,
}: {
  n: NotificationRow;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const Icon = ICON[n.kind] ?? Bell;
  const unread = !n.read_at;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { borderColor: theme.border },
        unread && { backgroundColor: theme.primarySoft, borderColor: theme.primarySoft },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.surface }]}>
        <Icon size={16} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{n.title}</Text>
        {n.body ? (
          <Text variant="caption" tone="soft" numberOfLines={2}>
            {n.body}
          </Text>
        ) : null}
        <Text variant="caption" tone="soft" style={styles.when}>
          {relativeDay(n.created_at)}
        </Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  when: { marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
