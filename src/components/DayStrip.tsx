import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatDayShort, sameDay } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  days: Date[];
  value: Date;
  onChange: (d: Date) => void;
  /** giorni (per chiave) che hanno slot disponibili */
  availableKeys?: Set<string>;
};

const key = (d: Date) => d.toISOString().slice(0, 10);

export function DayStrip({ days, value, onChange, availableKeys }: Props) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {days.map((d) => {
        const active = sameDay(d, value);
        const has = !availableKeys || availableKeys.has(key(d));
        const [weekday, ...rest] = formatDayShort(d).split(' ');
        return (
          <Pressable
            key={key(d)}
            onPress={() => onChange(d)}
            style={[
              styles.day,
              { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.surface },
              !has && styles.dim,
            ]}
          >
            <Text variant="caption" color={active ? theme.primaryText : theme.textSoft}>
              {weekday}
            </Text>
            <Text variant="bodyStrong" color={active ? theme.primaryText : theme.text}>
              {rest.join(' ')}
            </Text>
            {has && !active ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'flex-start' },
  day: {
    width: 60,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  dim: { opacity: 0.4 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
