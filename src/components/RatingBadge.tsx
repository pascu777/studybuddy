import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  value: number | null;
  count?: number;
};

/** Badge valutazione. Con `value` nullo mostra "Nuovo" (nessun rating finto). */
export function RatingBadge({ value, count }: Props) {
  const theme = useTheme();

  if (value == null) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.surfaceAlt }]}>
        <Text variant="caption" tone="soft">
          Nuovo
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: theme.successSoft }]}>
      <Star size={12} color={theme.success} fill={theme.success} />
      <Text variant="caption" color={theme.success}>
        {value.toFixed(1)}
        {count ? ` (${count})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
