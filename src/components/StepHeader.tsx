import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  step?: number;
  total?: number;
  onBack?: () => void;
};

export function StepHeader({ title, subtitle, step, total, onBack }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Indietro"
            style={[styles.backBtn, { borderColor: theme.border }]}
          >
            <ChevronLeft size={20} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        {step && total ? (
          <View style={styles.progress}>
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i < step ? theme.primary : theme.border,
                    width: i === step - 1 ? 22 : 7,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.backBtn} />
      </View>

      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" tone="soft" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 7, borderRadius: radius.pill },
  title: { marginTop: spacing.sm },
  subtitle: { marginTop: 2 },
});
