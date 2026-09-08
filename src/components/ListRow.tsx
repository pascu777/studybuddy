import { ChevronRight } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type ListRowProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
  slotRight?: ReactNode;
  showChevron?: boolean;
  danger?: boolean;
};

export function ListRow({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  slotRight,
  showChevron = true,
  danger = false,
}: ListRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { backgroundColor: theme.surfaceAlt }]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceAlt, borderRadius: radius.sm }]}>
          {icon}
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="bodyStrong" tone={danger ? 'danger' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="soft">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.surfaceAlt }]}>
          <Text variant="caption" tone="soft">
            {badge}
          </Text>
        </View>
      ) : null}
      {slotRight}
      {showChevron && onPress ? <ChevronRight size={18} color={theme.textSoft} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  iconWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
});
