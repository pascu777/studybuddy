import { Link, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
import { APP_NAME, APP_TAGLINE } from '@/constants/app';
import { authErrorMessage, useSignIn } from '@/features/auth/hooks';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import { validateEmail } from '@/lib/validation';

type Method = 'email' | 'phone' | 'social';

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const signIn = useSignIn();

  const [method, setMethod] = useState<Method>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    const emailError = validateEmail(email);
    const passwordError = password ? null : 'Inserisci la password.';
    setErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;

    setFormError(null);
    try {
      await signIn.mutateAsync({ email, password });
      router.replace('/');
    } catch (e) {
      setFormError(authErrorMessage(e));
    }
  };

  return (
    <>
      <Head>
        <title>{`Accedi — ${APP_NAME}`}</title>
      </Head>
      <Screen scroll footer={
      <Text variant="body" tone="soft" center>
        Non hai un account?{' '}
        <Link href="/(auth)/sign-up" style={styles.linkStrong}>
          <Text variant="bodyStrong" tone="primary">Registrati</Text>
        </Link>
      </Text>
    }>
      <View style={styles.header}>
        <Logo variant="stacked" size={52} />
        <Text variant="body" tone="soft" center>
          {APP_TAGLINE}
        </Text>
      </View>

      <Text variant="title" style={styles.title}>
        Bentornato
      </Text>

      <SegmentedControl<Method>
        value={method}
        onChange={setMethod}
        segments={[
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Telefono', disabled: true, badge: 'presto' },
          { value: 'social', label: 'Social', disabled: true, badge: 'presto' },
        ]}
      />

      <View style={styles.form}>
        <TextField
          label="Email"
          placeholder="tuonome@email.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          iconLeft={<Mail size={18} color={theme.textSoft} />}
        />
        <PasswordField
          label="Password"
          placeholder="La tua password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          hitSlop={8}
          style={styles.forgot}
        >
          <Text variant="label" tone="primary">
            Password dimenticata?
          </Text>
        </Pressable>

        {formError ? (
          <Text variant="caption" tone="danger" center>
            {formError}
          </Text>
        ) : null}

        <Button label="Accedi" onPress={submit} loading={signIn.isPending} />
      </View>

      <SocialButtons enabled={false} context="signin" />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl },
  title: { marginBottom: spacing.lg },
  form: { gap: spacing.md, marginVertical: spacing.lg },
  forgot: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
  linkStrong: { textDecorationLine: 'none' },
});
