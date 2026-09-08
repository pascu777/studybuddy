import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  value: number | string;
  label: string;
  icon?: ReactNode;
  highlight?: boolean;
};

export function StatTile({ value, label, icon, highlight }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: highlight ? theme.primary : theme.surface,
          borderColor: highlight ? theme.primary : theme.border,
        },
      ]}
    >
      <View style={styles.top}>
        <Text
          style={[
            styles.value,
            { color: highlight ? theme.primaryText : theme.text },
          ]}
        >
          {value}
        </Text>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
      </View>
      <Text
        variant="caption"
        color={highlight ? theme.primaryText : theme.textSoft}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 96,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  value: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  icon: { opacity: 0.7, marginTop: 2 },
});
