import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, PasswordField, Screen, StepHeader, Text } from '@/components';
import { authErrorMessage, useUpdatePassword } from '@/features/auth/hooks';
import { useSession } from '@/features/auth/session-provider';
import { validatePassword } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

/**
 * Raggiunta dal deep link `studybuddy://reset-password` dopo il click sull'email.
 * Supabase crea una sessione di recupero: qui si imposta la nuova password.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { session } = useSession();
  const update = useUpdatePassword();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const next = {
      password: validatePassword(password),
      confirm: password !== confirm ? 'Le password non coincidono.' : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFormError(null);
    try {
      await update.mutateAsync(password);
      setDone(true);
    } catch (e) {
      setFormError(authErrorMessage(e));
    }
  };

  return (
    <Screen
      scroll
      footer={
        done ? (
          <Button label="Continua" onPress={() => router.replace('/')} />
        ) : (
          <Button label="Salva password" onPress={submit} loading={update.isPending} />
        )
      }
    >
      <StepHeader
        title="Nuova password"
        subtitle="Scegli una nuova password per il tuo account."
      />

      {!session ? (
        <Text variant="body" tone="soft" style={styles.note}>
          Apri questa pagina dal link ricevuto via email. Se il link è scaduto, richiedine uno nuovo
          dalla schermata di accesso.
        </Text>
      ) : done ? (
        <Text variant="body" tone="success" style={styles.note}>
          Password aggiornata. Ora puoi continuare.
        </Text>
      ) : (
        <View style={styles.form}>
          <PasswordField
            label="Nuova password"
            placeholder="Almeno 8 caratteri"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />
          <PasswordField
            label="Conferma password"
            placeholder="Ripeti la password"
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
          />
          {formError ? (
            <Text variant="caption" tone="danger">
              {formError}
            </Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, marginTop: spacing.md },
  note: { marginTop: spacing.md },
});
