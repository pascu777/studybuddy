import { CalendarClock, Laptop, MapPin, Zap } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatFullDate, formatRange } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import type { BookingStatus, MyBookingRow } from '@/types/database';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { Text } from './Text';

const STATUS: Record<BookingStatus, { label: string; tone: 'soft' | 'primary' | 'success' | 'danger' }> = {
  pending: { label: 'In attesa', tone: 'primary' },
  confirmed: { label: 'Confermata', tone: 'success' },
  declined: { label: 'Rifiutata', tone: 'danger' },
  cancelled: { label: 'Annullata', tone: 'soft' },
  completed: { label: 'Completata', tone: 'soft' },
};

type Props = {
  booking: MyBookingRow;
  footer?: ReactNode;
};

export function BookingCard({ booking, footer }: Props) {
  const theme = useTheme();
  const name = `${booking.counterpart_first_name} ${booking.counterpart_last_name}`.trim();
  const st = STATUS[booking.status];
  const toneColor = {
    soft: theme.textSoft,
    primary: theme.primary,
    success: theme.success,
    danger: theme.danger,
  }[st.tone];

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Avatar uri={booking.counterpart_avatar_url} name={name} size={40} />
        <View style={styles.headText}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="soft">
            {booking.subject_name ?? 'Lezione'}
            {booking.role === 'student' ? ' · tutor' : ' · studente'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.surfaceAlt }]}>
          <Text variant="caption" color={toneColor}>
            {st.label}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <CalendarClock size={13} color={theme.textSoft} />
          <Text variant="caption" tone="soft">
            {formatFullDate(booking.starts_at)} · {formatRange(booking.starts_at, booking.ends_at)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          {booking.mode === 'online' ? (
            <Laptop size={13} color={theme.textSoft} />
          ) : (
            <MapPin size={13} color={theme.textSoft} />
          )}
          <Text variant="caption" tone="soft">
            {booking.mode === 'online' ? 'Online' : 'In presenza'}
          </Text>
          {booking.is_emergency ? (
            <>
              <Zap size={13} color={theme.danger} />
              <Text variant="caption" tone="danger">
                Emergenza
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {booking.message ? (
        <Text variant="caption" tone="soft" style={styles.note}>
          “{booking.message}”
        </Text>
      ) : null}
      {booking.tutor_note ? (
        <Text variant="caption" tone="soft" style={styles.note}>
          Nota del tutor: {booking.tutor_note}
        </Text>
      ) : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  meta: { gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  note: { fontStyle: 'italic' },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
