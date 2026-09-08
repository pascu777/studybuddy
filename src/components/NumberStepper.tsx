import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
};

export function NumberStepper({ value, min = 1, max = 10, onChange, format }: Props) {
  const theme = useTheme();
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  return (
    <View style={[styles.wrap, { borderColor: theme.border }]}>
      <Pressable
        onPress={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        style={[styles.btn, value <= min && styles.disabled]}
        accessibilityLabel="Diminuisci"
      >
        <Minus size={18} color={theme.text} />
      </Pressable>
      <Text variant="bodyStrong" style={styles.value}>
        {format ? format(value) : value}
      </Text>
      <Pressable
        onPress={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        style={[styles.btn, value >= max && styles.disabled]}
        accessibilityLabel="Aumenta"
      >
        <Plus size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
  },
  btn: { padding: spacing.sm },
  disabled: { opacity: 0.35 },
  value: { minWidth: 96, textAlign: 'center' },
});
