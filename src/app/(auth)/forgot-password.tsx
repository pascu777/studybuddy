import { useRouter } from 'expo-router';
import { Mail, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, StepHeader, Text, TextField } from '@/components';
import { authErrorMessage, useSendPasswordReset } from '@/features/auth/hooks';
import { validateEmail } from '@/lib/validation';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const reset = useSendPasswordReset();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const emailError = validateEmail(email);
    setError(emailError);
    if (emailError) return;
    try {
      await reset.mutateAsync(email);
      setSent(true);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <Screen
      scroll
      footer={
        sent ? (
          <Button label="Torna all'accesso" variant="secondary" onPress={() => router.replace('/(auth)/sign-in')} />
        ) : (
          <Button label="Invia link" onPress={submit} loading={reset.isPending} />
        )
      }
    >
      <StepHeader
        title="Reimposta la password"
        subtitle="Ti inviamo un link per crearne una nuova."
        onBack={() => router.back()}
      />

      {sent ? (
        <View style={styles.doneWrap}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <MailCheck size={28} color={theme.primary} />
          </View>
          <Text variant="body" tone="soft" center style={styles.doneText}>
            Se esiste un account per <Text variant="bodyStrong">{email}</Text>, riceverai a breve
            un'email con le istruzioni.
          </Text>
        </View>
      ) : (
        <TextField
          label="Email"
          placeholder="tuonome@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={error}
          iconLeft={<Mail size={18} color={theme.textSoft} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  doneWrap: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { maxWidth: 320 },
});
