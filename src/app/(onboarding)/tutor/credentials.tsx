import { useRouter } from 'expo-router';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Screen,
  StepHeader,
  Text,
  TextField,
  ToggleRow,
} from '@/components';
import { stepCount } from '@/features/onboarding/steps';
import {
  useDeleteCredential,
  useSaveCredential,
  useTutorCredentials,
  useUpsertTutorProfile,
} from '@/features/profile/hooks';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const STATUS_LABEL: Record<string, string> = {
  none: 'Non verificato',
  requested: 'Verifica richiesta',
  verified: 'Verificato',
  rejected: 'Verifica respinta',
};

export default function TutorCredentialsStep() {
  const theme = useTheme();
  const router = useRouter();
  const { data: credentials = [] } = useTutorCredentials();
  const saveCredential = useSaveCredential();
  const deleteCredential = useDeleteCredential();
  const upsertTutor = useUpsertTutorProfile();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [year, setYear] = useState('');
  const [requestVerification, setRequestVerification] = useState(true);
  const [proceeding, setProceeding] = useState(false);

  const addCredential = async () => {
    if (!title.trim()) return;
    try {
      await saveCredential.mutateAsync({
        title,
        institution,
        year: year ? Number(year) : null,
        requestVerification,
      });
      setTitle('');
      setInstitution('');
      setYear('');
      setRequestVerification(true);
      setShowForm(false);
    } catch {
      Alert.alert('Ops', 'Non è stato possibile salvare il titolo. Riprova.');
    }
  };

  const goNext = async () => {
    setProceeding(true);
    try {
      // Crea la riga tutor_profiles (segna il passaggio dello step) se non esiste.
      await upsertTutor.mutateAsync({});
      router.push('/(onboarding)/tutor/teaching');
    } catch {
      Alert.alert('Ops', 'Riprova tra un momento.');
    } finally {
      setProceeding(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          label={credentials.length ? 'Continua' : 'Salta per ora'}
          onPress={goNext}
          loading={proceeding}
        />
      }
    >
      <StepHeader
        title="Titoli di studio"
        subtitle="Aggiungili per ottenere il badge Verificato. La verifica è fatta dal nostro team su tua richiesta."
        step={2}
        total={stepCount('tutor')}
        onBack={() => router.back()}
      />

      <View style={styles.list}>
        {credentials.map((c) => (
          <Card key={c.id} padding="md" style={styles.credCard}>
            <View style={styles.credText}>
              <Text variant="bodyStrong">{c.title}</Text>
              {c.institution ? (
                <Text variant="caption" tone="soft">
                  {c.institution}
                  {c.year ? ` · ${c.year}` : ''}
                </Text>
              ) : null}
              <View style={[styles.statusPill, { backgroundColor: theme.surfaceAlt }]}>
                <ShieldCheck
                  size={12}
                  color={c.verification_status === 'verified' ? theme.success : theme.textSoft}
                />
                <Text variant="caption" tone="soft">
                  {STATUS_LABEL[c.verification_status] ?? c.verification_status}
                </Text>
              </View>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => deleteCredential.mutate(c.id)}
              accessibilityLabel="Elimina titolo"
            >
              <Trash2 size={18} color={theme.textSoft} />
            </Pressable>
          </Card>
        ))}
      </View>

      {showForm ? (
        <Card style={styles.form}>
          <TextField
            label="Titolo"
            placeholder="Es. Laurea in Matematica"
            value={title}
            onChangeText={setTitle}
          />
          <TextField
            label="Istituto / Ateneo"
            placeholder="Es. Università di Torino"
            value={institution}
            onChangeText={setInstitution}
          />
          <TextField
            label="Anno"
            placeholder="Es. 2021"
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            onChangeText={setYear}
          />
          <ToggleRow
            label="Richiedi la verifica"
            description="Il team controllerà il documento e assegnerà il badge."
            value={requestVerification}
            onValueChange={setRequestVerification}
          />
          <View style={styles.formActions}>
            <Button
              label="Annulla"
              variant="ghost"
              fullWidth={false}
              onPress={() => setShowForm(false)}
            />
            <Button
              label="Aggiungi"
              fullWidth={false}
              onPress={addCredential}
              loading={saveCredential.isPending}
            />
          </View>
        </Card>
      ) : (
        <Pressable
          onPress={() => setShowForm(true)}
          style={[styles.addBtn, { borderColor: theme.border }]}
        >
          <Plus size={18} color={theme.primary} />
          <Text variant="bodyStrong" tone="primary">
            Aggiungi un titolo
          </Text>
        </Pressable>
      )}

      <Text variant="caption" tone="soft" style={styles.note}>
        Il caricamento dei documenti sarà disponibile a breve: per ora inserisci i dati, ti
        contatteremo per la verifica.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, marginBottom: spacing.md },
  credCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  credText: { flex: 1, gap: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  form: { gap: spacing.md },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  note: { marginTop: spacing.lg },
});
