import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import { Text } from './Text';

export type InlineTab<T extends string> = { value: T; label: string; count?: number };

type Props<T extends string> = {
  tabs: InlineTab<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function InlineTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={[
              styles.tab,
              { borderColor: active ? theme.primary : theme.border },
              active && { backgroundColor: theme.primarySoft },
            ]}
          >
            <Text variant="label" color={active ? theme.onPrimarySoft : theme.textSoft}>
              {t.label}
            </Text>
            {t.count ? (
              <View style={[styles.badge, { backgroundColor: active ? theme.primary : theme.textSoft }]}>
                <Text variant="caption" color={theme.primaryText} style={styles.badgeText}>
                  {t.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'flex-start' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: 999,
  },
  badge: { minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 14 },
});
