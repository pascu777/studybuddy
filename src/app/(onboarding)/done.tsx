import { useRouter } from 'expo-router';
import { PartyPopper } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useProfile, useCompleteOnboarding } from '@/features/profile/hooks';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export default function OnboardingDone() {
  const theme = useTheme();
  const router = useRouter();
  const { data: full } = useProfile();
  const complete = useCompleteOnboarding();
  const [busy, setBusy] = useState(false);

  const isTutor = full?.profile.role === 'tutor';
  const name = full?.profile.first_name;

  const finish = async () => {
    setBusy(true);
    try {
      await complete.mutateAsync();
      router.replace('/(app)/home');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label="Inizia" onPress={finish} loading={busy} />}>
      <View style={styles.wrap}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <PartyPopper size={34} color={theme.primary} />
        </View>
        <Text variant="title" center>
          {name ? `Tutto pronto, ${name}!` : 'Tutto pronto!'}
        </Text>
        <Text variant="body" tone="soft" center style={styles.text}>
          {isTutor
            ? 'Il tuo profilo è attivo. Il prossimo passo sarà impostare la tua disponibilità e ricevere le prime richieste.'
            : 'Il tuo profilo è pronto. Il prossimo passo sarà cercare un tutor per le tue materie, vicino a te o online.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  icon: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { maxWidth: 340 },
});
