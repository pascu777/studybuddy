import { Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
};

export function Chip({ label, selected = false, onPress, onRemove }: ChipProps) {
  const theme = useTheme();

  const body = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        variant="label"
        color={selected ? theme.onPrimarySoft : theme.textSoft}
        numberOfLines={1}
      >
        {label}
      </Text>
      {onRemove ? (
        <Pressable hitSlop={8} onPress={onRemove} accessibilityLabel={`Rimuovi ${label}`}>
          <X size={14} color={selected ? theme.onPrimarySoft : theme.textSoft} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
