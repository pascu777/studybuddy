import { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { palette, radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon?: ReactNode;
};

export function ToggleRow({ label, description, value, onValueChange, icon }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.texts}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="caption" tone="soft">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={palette.white}
        ios_backgroundColor={theme.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  icon: { width: 24, alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
});
