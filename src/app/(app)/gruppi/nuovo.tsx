import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Screen, StepHeader, Text, TextField } from '@/components';
import { useSubjects } from '@/features/catalog/hooks';
import { useCreateGroup } from '@/features/groups/hooks';
import { useProfile } from '@/features/profile/hooks';
import { spacing } from '@/theme/tokens';

export default function NuovaClasseScreen() {
  const router = useRouter();
  const { data: full } = useProfile();
  const { data: subjects = [] } = useSubjects(full?.profile.school_context ?? undefined);
  const createGroup = useCreateGroup();

  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Nome mancante', 'Dai un nome alla classe.');
      return;
    }
    try {
      const g = await createGroup.mutateAsync({ name, subjectId, description });
      router.replace({ pathname: '/(app)/gruppi/[id]', params: { id: g.id } });
    } catch {
      Alert.alert('Ops', 'Non è stato possibile creare la classe. Riprova.');
    }
  };

  return (
    <Screen scroll footer={<Button label="Crea classe" onPress={submit} loading={createGroup.isPending} />}>
      <StepHeader title="Nuova classe" onBack={() => router.back()} />

      <View style={styles.form}>
        <TextField
          label="Nome della classe"
          placeholder="Es. Maturità Matematica — 5ª B"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.block}>
          <Text variant="label" tone="soft">
            MATERIA (FACOLTATIVO)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Nessuna" selected={!subjectId} onPress={() => setSubjectId(null)} />
            {subjects.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                selected={s.id === subjectId}
                onPress={() => setSubjectId(s.id === subjectId ? null : s.id)}
              />
            ))}
          </ScrollView>
        </View>

        <TextField
          label="Descrizione (facoltativo)"
          placeholder="Obiettivi, programma, note…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.textarea}
        />

        <Text variant="caption" tone="soft">
          Dopo aver creato la classe potrai aggiungere studenti (anche fuori dal tuo portfolio) e
          pianificare le sessioni.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, marginTop: spacing.sm },
  block: { gap: spacing.sm },
  chips: { gap: spacing.xs, paddingVertical: 2 },
  textarea: { minHeight: 72, textAlignVertical: 'top', paddingTop: spacing.sm },
});
