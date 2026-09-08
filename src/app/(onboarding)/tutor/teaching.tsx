import { useRouter } from 'expo-router';
import { Laptop, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  NumberStepper,
  Screen,
  StepHeader,
  Text,
  ToggleRow,
} from '@/components';
import { SubjectPicker } from '@/features/catalog/SubjectPicker';
import { levelLabel } from '@/features/catalog/levels';
import { stepCount } from '@/features/onboarding/steps';
import {
  useSaveTutorSubjects,
  useUpsertTutorProfile,
  type TutorSubjectInput,
} from '@/features/profile/hooks';
import { spacing } from '@/theme/tokens';
import type { SchoolContext } from '@/types/database';

export default function TutorTeachingStep() {
  const router = useRouter();
  const upsertTutor = useUpsertTutorProfile();
  const saveSubjects = useSaveTutorSubjects();

  const [highSchool, setHighSchool] = useState(true);
  const [university, setUniversity] = useState(false);
  const [inPerson, setInPerson] = useState(true);
  const [online, setOnline] = useState(true);

  const [hsSubjects, setHsSubjects] = useState<string[]>([]);
  const [uniSubjects, setUniSubjects] = useState<string[]>([]);
  const [hsRange, setHsRange] = useState<[number, number]>([1, 5]);
  const [uniLevel, setUniLevel] = useState<[number, number]>([1, 5]);
  const [saving, setSaving] = useState(false);

  const canProceed = useMemo(() => {
    if (!highSchool && !university) return false;
    if (!inPerson && !online) return false;
    if (highSchool && hsSubjects.length === 0) return false;
    if (university && uniSubjects.length === 0) return false;
    return true;
  }, [highSchool, university, inPerson, online, hsSubjects, uniSubjects]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const submit = async () => {
    if (!canProceed) {
      Alert.alert('Completa i campi', 'Scegli almeno un ambito, una modalità e le relative materie.');
      return;
    }
    setSaving(true);
    try {
      await upsertTutor.mutateAsync({
        teaches_high_school: highSchool,
        teaches_university: university,
        delivery_in_person: inPerson,
        delivery_online: online,
      });

      const items: TutorSubjectInput[] = [];
      if (highSchool) {
        for (const id of hsSubjects) {
          items.push({
            subjectId: id,
            schoolContext: 'high_school',
            levelFrom: hsRange[0],
            levelTo: hsRange[1],
          });
        }
      }
      if (university) {
        for (const id of uniSubjects) {
          items.push({
            subjectId: id,
            schoolContext: 'university',
            levelFrom: uniLevel[0],
            levelTo: uniLevel[1],
          });
        }
      }
      await saveSubjects.mutateAsync(items);
      router.push('/(onboarding)/done');
    } catch {
      Alert.alert('Ops', 'Non è stato possibile salvare. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const rangeControls = (
    ctx: SchoolContext,
    range: [number, number],
    setRange: (v: [number, number]) => void,
  ) => (
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
            format={(v) => levelLabel(ctx, v)}
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
            format={(v) => levelLabel(ctx, v)}
          />
        </View>
      </View>
    </Card>
  );

  return (
    <Screen
      scroll
      footer={<Button label="Continua" onPress={submit} loading={saving} disabled={!canProceed} />}
    >
      <StepHeader
        title="Cosa insegni"
        subtitle="Definisci ambito, materie e modalità delle tue lezioni."
        step={3}
        total={stepCount('tutor')}
        onBack={() => router.back()}
      />

      <Text variant="heading" style={styles.section}>
        Ambito
      </Text>
      <View style={styles.toggles}>
        <ToggleRow label="Scuole superiori" value={highSchool} onValueChange={setHighSchool} />
        <ToggleRow label="Università" value={university} onValueChange={setUniversity} />
      </View>

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

      {highSchool ? (
        <View style={styles.block}>
          <Text variant="heading" style={styles.section}>
            Materie · Superiori
          </Text>
          {rangeControls('high_school', hsRange, setHsRange)}
          <SubjectPicker
            ctx="high_school"
            selected={hsSubjects}
            onToggle={(id) => toggle(hsSubjects, setHsSubjects, id)}
          />
        </View>
      ) : null}

      {university ? (
        <View style={styles.block}>
          <Text variant="heading" style={styles.section}>
            Materie · Università
          </Text>
          {rangeControls('university', uniLevel, setUniLevel)}
          <SubjectPicker
            ctx="university"
            selected={uniSubjects}
            onToggle={(id) => toggle(uniSubjects, setUniSubjects, id)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  toggles: { gap: spacing.sm },
  block: { marginTop: spacing.sm },
  rangeCard: { gap: spacing.sm, marginBottom: spacing.md },
  rangeRow: { flexDirection: 'row', gap: spacing.md },
  rangeCol: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
});
