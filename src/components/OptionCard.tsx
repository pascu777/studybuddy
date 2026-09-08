import { Check } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onPress: () => void;
};

export function OptionCard({ title, description, icon, selected, onPress }: Props) {
  const theme = useTheme();

  return (
    <Card onPress={onPress} selected={selected} style={styles.card}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: selected ? theme.primarySoft : theme.surfaceAlt }]}>
          {icon}
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="heading">{title}</Text>
        {description ? (
          <Text variant="caption" tone="soft">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.check,
          {
            borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected ? theme.primary : 'transparent',
          },
        ]}
      >
        {selected ? <Check size={14} color={theme.primaryText} strokeWidth={3} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
