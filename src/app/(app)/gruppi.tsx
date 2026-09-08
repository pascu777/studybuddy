import { useRouter } from 'expo-router';
import { Plus, Users } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, EmptyState, GroupCard, Screen, StepHeader } from '@/components';
import { useMyGroups } from '@/features/groups/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

export default function GruppiScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: full } = useProfile();
  const isTutor = full?.profile.role === 'tutor';
  const { data: groups = [], isLoading } = useMyGroups();

  return (
    <Screen
      scroll
      footer={
        isTutor ? (
          <Button
            label="Crea una classe"
            iconLeft={<Plus size={16} color={theme.primaryText} />}
            onPress={() => router.push('/(app)/gruppi/nuovo')}
          />
        ) : undefined
      }
    >
      <StepHeader
        title="Classi di gruppo"
        subtitle={
          isTutor
            ? 'Organizza più studenti in una classe e pianifica sessioni condivise.'
            : 'Le classi a cui il tuo tutor ti ha aggiunto.'
        }
        onBack={() => router.back()}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users size={28} color={theme.primary} />}
          title={isTutor ? 'Ancora nessuna classe' : 'Nessuna classe'}
          description={
            isTutor
              ? 'Crea la prima classe: potrai aggiungere studenti anche fuori dal tuo portfolio.'
              : 'Quando un tutor ti aggiunge a una classe la vedi qui.'
          }
        />
      ) : (
        <View style={styles.list}>
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onPress={() => router.push({ pathname: '/(app)/gruppi/[id]', params: { id: g.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.xxxl },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
});
