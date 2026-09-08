import { useRouter } from 'expo-router';

import { Card, ListRow, Screen, SegmentedControl, StepHeader, Text } from '@/components';
import { useAppTheme, type ThemePreference } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import { StyleSheet, View } from 'react-native';

export default function PreferenzeScreen() {
  const router = useRouter();
  const { preference, setPreference } = useAppTheme();

  return (
    <Screen scroll>
      <StepHeader title="Preferenze" onBack={() => router.back()} />

      <Text variant="label" tone="soft" style={styles.section}>
        TEMA
      </Text>
      <SegmentedControl<ThemePreference>
        value={preference}
        onChange={setPreference}
        segments={[
          { value: 'system', label: 'Sistema' },
          { value: 'light', label: 'Chiaro' },
          { value: 'dark', label: 'Scuro' },
        ]}
      />

      <Text variant="label" tone="soft" style={styles.section}>
        LINGUA
      </Text>
      <Card padding="sm">
        <ListRow title="Italiano" badge="Attiva" showChevron={false} />
      </Card>
      <Text variant="caption" tone="soft" style={styles.note}>
        Altre lingue verranno aggiunte più avanti.
      </Text>
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: 0.6 },
  note: { marginTop: spacing.sm },
});
