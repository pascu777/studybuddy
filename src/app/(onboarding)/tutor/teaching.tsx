import { useRouter } from 'expo-router';
import { Laptop, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, NumberStepper, Screen, StepHeader, Text, ToggleRow } from '@/components';
import { SubjectPicker } from '@/features/catalog/SubjectPicker';
import { levelLabel } from '@/features/catalog/levels';
import { stepCount } from '@/features/onboarding/steps';
import {
  useSaveTutorSubjects,
  useUpsertTutorProfile,
  type TutorSubjectInput,
} from '@/features/profile/hooks';
import { spacing } from '@/theme/tokens';

export default function TutorTeachingStep() {
  const router = useRouter();
  const upsertTutor = useUpsertTutorProfile();
  const saveSubjects = useSaveTutorSubjects();

  const [inPerson, setInPerson] = useState(true);
  const [online, setOnline] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [range, setRange] = useState<[number, number]>([1, 5]);
  const [saving, setSaving] = useState(false);

  const canProceed = useMemo(() => {
    if (!inPerson && !online) return false;
    if (subjects.length === 0) return false;
    return true;
  }, [inPerson, online, subjects]);

  const toggle = (id: string) =>
    setSubjects((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    if (!canProceed) {
      Alert.alert('Completa i campi', 'Scegli almeno una modalità e le materie che insegni.');
      return;
    }
    setSaving(true);
    try {
      await upsertTutor.mutateAsync({
        teaches_high_school: false,
        teaches_university: true,
        delivery_in_person: inPerson,
        delivery_online: online,
      });

      const items: TutorSubjectInput[] = subjects.map((id) => ({
        subjectId: id,
        schoolContext: 'university',
        levelFrom: range[0],
        levelTo: range[1],
      }));
      await saveSubjects.mutateAsync(items);
      router.push('/(onboarding)/done');
    } catch {
      Alert.alert('Ops', 'Non è stato possibile salvare. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scroll
      footer={<Button label="Continua" onPress={submit} loading={saving} disabled={!canProceed} />}
    >
      <StepHeader
        title="Cosa insegni"
        subtitle="Definisci materie e modalità delle tue lezioni."
        step={3}
        total={stepCount('tutor')}
        onBack={() => router.back()}
      />

      <Text variant="heading" style={styles.section}>
        Modalità
      </Text>
      <View style={styles.toggles}>
        <ToggleRow
          label="In presenza"
          value={inPerson}
          onValueChange={setInPerson}
          icon={<Users size={18} color="#8B6BFF" />}
        />
        <ToggleRow
          label="Online"
          value={online}
          onValueChange={setOnline}
          icon={<Laptop size={18} color="#8B6BFF" />}
        />
      </View>

      <Text variant="heading" style={styles.section}>
        Materie
      </Text>
      <Card padding="md" style={styles.rangeCard}>
        <Text variant="label" tone="soft">
          LIVELLI COPERTI
        </Text>
        <View style={styles.rangeRow}>
          <View style={styles.rangeCol}>
            <Text variant="caption" tone="soft">
              Da
            </Text>
            <NumberStepper
              value={range[0]}
              min={1}
              max={5}
              onChange={(v) => setRange([v, Math.max(v, range[1])])}
              format={(v) => levelLabel('university', v)}
            />
          </View>
          <View style={styles.rangeCol}>
            <Text variant="caption" tone="soft">
              A
            </Text>
            <NumberStepper
              value={range[1]}
              min={1}
              max={5}
              onChange={(v) => setRange([Math.min(range[0], v), v])}
              format={(v) => levelLabel('university', v)}
            />
          </View>
        </View>
      </Card>
      <SubjectPicker ctx="university" selected={subjects} onToggle={toggle} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  toggles: { gap: spacing.sm },
  rangeCard: { gap: spacing.sm, marginBottom: spacing.md },
  rangeRow: { flexDirection: 'row', gap: spacing.md },
  rangeCol: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
});
