import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

export type Segment<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  badge?: string;
};

type Props<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
}: Props<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <Pressable
            key={seg.value}
            disabled={seg.disabled}
            onPress={() => onChange(seg.value)}
            style={[
              styles.item,
              size === 'sm' ? styles.itemSm : styles.itemMd,
              active && { backgroundColor: theme.surface },
              active && styles.activeShadow,
              seg.disabled && styles.disabled,
            ]}
          >
            <Text
              variant="label"
              tone={active ? 'default' : 'soft'}
              style={styles.label}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
            {seg.badge ? (
              <Text variant="caption" tone="soft" style={styles.badge}>
                {seg.badge}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  itemMd: { paddingVertical: spacing.md },
  itemSm: { paddingVertical: spacing.sm },
  activeShadow: {
    shadowColor: '#1B1730',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  disabled: { opacity: 0.5 },
  label: { textTransform: 'uppercase', letterSpacing: 0.6 },
  badge: { marginTop: 2, fontSize: 10 },
});
