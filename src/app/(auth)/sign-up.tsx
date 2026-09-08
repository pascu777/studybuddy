import { Link, useRouter } from 'expo-router';
import { Mail, MailCheck, User } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Logo,
  PasswordField,
  Screen,
  SegmentedControl,
  SocialButtons,
  Text,
  TextField,
} from '@/components';
import { authErrorMessage, useSignIn, useSignUp } from '@/features/auth/hooks';
import { env } from '@/lib/env';
import { splitFullName, validateEmail, validatePassword, validateRequired } from '@/lib/validation';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const signUp = useSignUp();
  const signIn = useSignIn();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const next: Record<string, string | null> = {
      fullName: validateRequired(fullName, 'Nome e cognome'),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: password !== confirm ? 'Le password non coincidono.' : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setFormError(null);
    const { firstName, lastName } = splitFullName(fullName);
    try {
      const { needsConfirmation } = await signUp.mutateAsync({
        email,
        password,
        firstName,
        lastName,
      });

      if (needsConfirmation && !env.skipEmailConfirmation) {
        setSent(true);
        return;
      }
      // Sessione già attiva (conferma disattivata): entra e vai all'onboarding.
      if (needsConfirmation && env.skipEmailConfirmation) {
        await signIn.mutateAsync({ email, password });
      }
      router.replace('/');
    } catch (e) {
      setFormError(authErrorMessage(e));
    }
  };

  if (sent) {
    return (
      <Screen
        footer={<Button label="Vai all'accesso" variant="secondary" onPress={() => router.replace('/(auth)/sign-in')} />}
      >
        <View style={styles.confirmWrap}>
          <View style={[styles.confirmIcon, { backgroundColor: theme.primarySoft }]}>
            <MailCheck size={30} color={theme.primary} />
          </View>
          <Text variant="title" center>
            Controlla la tua email
          </Text>
          <Text variant="body" tone="soft" center style={styles.confirmText}>
            Ti abbiamo inviato un link a <Text variant="bodyStrong">{email}</Text> per confermare
            l'account. Aprilo per completare la registrazione.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <Text variant="body" tone="soft" center>
          Hai già un account?{' '}
          <Link href="/(auth)/sign-in">
            <Text variant="bodyStrong" tone="primary">Accedi</Text>
          </Link>
        </Text>
      }
    >
      <View style={styles.header}>
        <Logo variant="stacked" size={48} />
      </View>

      <Text variant="title" style={styles.title}>
        Crea il tuo account
      </Text>

      <SegmentedControl
        value="email"
        onChange={() => {}}
        segments={[
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Telefono', disabled: true, badge: 'presto' },
          { value: 'social', label: 'Social', disabled: true, badge: 'presto' },
        ]}
      />

      <View style={styles.form}>
        <TextField
          label="Nome e cognome"
          placeholder="Marco Rossi"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          iconLeft={<User size={18} color={theme.textSoft} />}
        />
        <TextField
          label="Email"
          placeholder="tuonome@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          iconLeft={<Mail size={18} color={theme.textSoft} />}
        />
        <PasswordField
          label="Password"
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
          <Text variant="caption" tone="danger" center>
            {formError}
          </Text>
        ) : null}

        <Button label="Registrati" onPress={submit} loading={signUp.isPending || signIn.isPending} />

        <Text variant="caption" tone="soft" center>
          Registrandoti accetti i Termini e l'Informativa privacy.
        </Text>
      </View>

      <SocialButtons enabled={false} context="signup" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
  title: { marginBottom: spacing.lg },
  form: { gap: spacing.md, marginVertical: spacing.lg },
  confirmWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  confirmIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { maxWidth: 340 },
});
