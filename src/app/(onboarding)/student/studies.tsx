import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, NumberStepper, Screen, StepHeader, Text, TextField } from '@/components';
import { SubjectPicker } from '@/features/catalog/SubjectPicker';
import { levelLabel } from '@/features/catalog/levels';
import { useDegreeCourses } from '@/features/university/hooks';
import { stepCount } from '@/features/onboarding/steps';
import {
  useSaveStudentSubjects,
  useUpdateProfile,
  useUpsertStudentProfile,
  type StudentSubjectInput,
} from '@/features/profile/hooks';
import { spacing } from '@/theme/tokens';

export default function StudentStudiesStep() {
  const router = useRouter();
  const upsertStudent = useUpsertStudentProfile();
  const saveSubjects = useSaveStudentSubjects();
  const updateProfile = useUpdateProfile();

  const { data: degreeCourses = [] } = useDegreeCourses();
  const [universityName, setUniversityName] = useState('');
  const [degreeCourse, setDegreeCourse] = useState('');
  const [degreeCourseId, setDegreeCourseId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [level, setLevel] = useState(1);
  const [saving, setSaving] = useState(false);

  const canProceed = useMemo(() => {
    if (subjects.length === 0) return false;
    if (!degreeCourse.trim()) return false;
    return true;
  }, [subjects, degreeCourse]);

  const toggle = (id: string) =>
    setSubjects((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    if (!canProceed) {
      Alert.alert('Completa i campi', 'Indica il corso di laurea e almeno una materia.');
      return;
    }
    setSaving(true);
    try {
      await upsertStudent.mutateAsync({
        school_type: 'university',
        school_name: '',
        university_name: universityName.trim(),
        degree_course: degreeCourse.trim(),
        degree_course_id: degreeCourseId,
      });
      await updateProfile.mutateAsync({ school_context: 'university' });

      const items: StudentSubjectInput[] = subjects.map((id) => ({
        subjectId: id,
        schoolContext: 'university',
        level,
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
        title="I tuoi studi"
        subtitle="Così ti proponiamo tutor e materiali adatti al tuo corso e al tuo anno."
        step={2}
        total={stepCount('student')}
        onBack={() => router.back()}
      />

      <View style={styles.form}>
        <View style={styles.block}>
          <Text variant="label" tone="soft">
            CORSO DI LAUREA
          </Text>
          {degreeCourses.length ? (
            <View style={styles.dcList}>
              {degreeCourses.map((dc) => (
                <Chip
                  key={dc.id}
                  label={`${dc.name} · ${dc.university_name}`}
                  selected={dc.id === degreeCourseId}
                  onPress={() => {
                    const sel = dc.id === degreeCourseId;
                    setDegreeCourseId(sel ? null : dc.id);
                    setDegreeCourse(sel ? '' : dc.name);
                    setUniversityName(sel ? '' : dc.university_name);
                  }}
                />
              ))}
            </View>
          ) : null}
          <TextField
            label="Non è in elenco? Scrivilo"
            placeholder="Es. Ingegneria Informatica"
            value={degreeCourse}
            onChangeText={(v) => {
              setDegreeCourse(v);
              setDegreeCourseId(null);
            }}
            hint="Con il corso in elenco potrai cercare tutor per singolo esame e docente."
          />
        </View>

        <Card padding="md" style={styles.levelCard}>
          <Text variant="label" tone="soft">
            IL TUO ANNO
          </Text>
          <NumberStepper
            value={level}
            min={1}
            max={5}
            onChange={setLevel}
            format={(v) => levelLabel('university', v)}
          />
        </Card>

        <Text variant="heading" style={styles.section}>
          Materie da studiare
        </Text>
        <SubjectPicker ctx="university" selected={subjects} onToggle={toggle} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, marginTop: spacing.lg },
  levelCard: { gap: spacing.sm, alignItems: 'flex-start' },
  section: { marginTop: spacing.md, marginBottom: spacing.xs },
  block: { gap: spacing.sm },
  dcList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
