import { StyleSheet, View } from 'react-native';

import { formatTime } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  body: string;
  createdAt: string;
  mine: boolean;
};

export function ChatBubble({ body, createdAt, mine }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? theme.primary : theme.surface,
            borderColor: mine ? theme.primary : theme.border,
            borderBottomRightRadius: mine ? 4 : radius.lg,
            borderBottomLeftRadius: mine ? radius.lg : 4,
          },
        ]}
      >
        <Text variant="body" color={mine ? theme.primaryText : theme.text}>
          {body}
        </Text>
        <Text
          variant="caption"
          color={mine ? theme.primaryText : theme.textSoft}
          style={[styles.time, mine && { opacity: 0.8 }]}
        >
          {formatTime(createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  time: { alignSelf: 'flex-end', fontSize: 10 },
});
