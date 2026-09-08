import { useRouter } from 'expo-router';
import { GraduationCap, Presentation } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, OptionCard, Screen, StepHeader, Text } from '@/components';
import { useSignOut } from '@/features/auth/hooks';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import type { UserRole } from '@/types/database';

export default function RoleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: full } = useProfile();
  const update = useUpdateProfile();
  const signOut = useSignOut();

  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (full?.profile.role) setRole(full.profile.role);
  }, [full?.profile.role]);

  const submit = async () => {
    if (!role) return;
    await update.mutateAsync({ role });
    router.push('/(onboarding)/profile');
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button label="Continua" onPress={submit} disabled={!role} loading={update.isPending} />
          <Button label="Esci" variant="ghost" onPress={() => signOut.mutate()} />
        </View>
      }
    >
      <StepHeader
        title="Come vuoi usare l'app?"
        subtitle="Puoi cambiare ruolo più avanti dalle impostazioni."
      />

      <View style={styles.options}>
        <OptionCard
          title="Sono uno studente"
          description="Cerco un tutor per le mie materie"
          icon={<GraduationCap size={24} color={theme.primary} />}
          selected={role === 'student'}
          onPress={() => setRole('student')}
        />
        <OptionCard
          title="Sono un tutor"
          description="Offro ripetizioni e gestisco la mia agenda"
          icon={<Presentation size={24} color={theme.primary} />}
          selected={role === 'tutor'}
          onPress={() => setRole('tutor')}
        />
      </View>

      <Text variant="caption" tone="soft" style={styles.note}>
        In base al ruolo ti chiederemo informazioni diverse per creare il profilo.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md },
  note: { marginTop: spacing.lg },
  footer: { gap: spacing.xs },
});
