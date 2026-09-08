import { Check, Laptop, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatRange } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import type { SlotMode } from '@/types/database';
import { Text } from './Text';

type Props = {
  startsAt: string;
  endsAt: string;
  mode: SlotMode;
  state: 'free' | 'held' | 'booked' | 'mine' | 'selected';
  onPress?: () => void;
};

const STATE_LABEL: Record<Props['state'], string> = {
  free: '',
  held: 'In attesa',
  booked: 'Occupato',
  mine: 'Tua richiesta',
  selected: '',
};

export function SlotPill({ startsAt, endsAt, mode, state, onPress }: Props) {
  const theme = useTheme();
  const disabled = state === 'held' || state === 'booked';
  const selected = state === 'selected' || state === 'mine';

  const bg = selected ? theme.primarySoft : theme.surface;
  const border = selected ? theme.primary : theme.border;

  const ModeIcon = mode === 'online' ? Laptop : Users;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled || !onPress}
      style={[styles.pill, { backgroundColor: bg, borderColor: border }, disabled && styles.dim]}
    >
      <View style={styles.left}>
        <Text variant="bodyStrong" color={selected ? theme.onPrimarySoft : theme.text}>
          {formatRange(startsAt, endsAt)}
        </Text>
        <View style={styles.mode}>
          <ModeIcon size={12} color={theme.textSoft} />
          <Text variant="caption" tone="soft">
            {mode === 'online' ? 'Online' : mode === 'in_person' ? 'In presenza' : 'In presenza / online'}
          </Text>
        </View>
      </View>
      {state === 'selected' ? (
        <Check size={16} color={theme.primary} strokeWidth={3} />
      ) : STATE_LABEL[state] ? (
        <Text variant="caption" tone={state === 'mine' ? 'primary' : 'soft'}>
          {STATE_LABEL[state]}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  dim: { opacity: 0.55 },
  left: { gap: 2 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
