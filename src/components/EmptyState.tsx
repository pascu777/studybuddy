import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>{icon}</View>
      ) : null}
      <Text variant="heading" center>
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="soft" center style={styles.desc}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: spacing.md, padding: spacing.xl },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  desc: { maxWidth: 320 },
  action: { marginTop: spacing.md, alignSelf: 'stretch' },
});
