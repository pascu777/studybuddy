import { useRouter } from 'expo-router';
import { Info, MapPin, Navigation, Plus, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  NumberStepper,
  Screen,
  StepHeader,
  Text,
  TextField,
  ToggleRow,
} from '@/components';
import { PhotoPicker } from '@/components/PhotoPicker';
import { useSession } from '@/features/auth/session-provider';
import { SubjectPicker } from '@/features/catalog/SubjectPicker';
import { levelLabel } from '@/features/catalog/levels';
import {
  uploadAvatar,
  useDeleteCredential,
  useProfile,
  useSaveCredential,
  useSaveStudentSubjects,
  useSaveTutorSubjects,
  useStudentSubjects,
  useTutorCredentials,
  useTutorSubjects,
  useUpdateProfile,
  useUpsertStudentProfile,
  useUpsertTutorProfile,
} from '@/features/profile/hooks';
import { geocodeText, getCurrentPlace, type Coords } from '@/lib/geo';
import { OCCASIONAL_INCOME_LIMIT_EUR } from '@/constants/app';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import type { SchoolContext } from '@/types/database';

const STATUS_LABEL: Record<string, string> = {
  none: 'Non verificato',
  requested: 'Verifica richiesta',
  verified: 'Verificato',
  rejected: 'Verifica respinta',
};

export default function ProfiloScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useSession();
  const { data: full, isLoading } = useProfile();

  const updateProfile = useUpdateProfile();
  const upsertTutor = useUpsertTutorProfile();
  const upsertStudent = useUpsertStudentProfile();
  const saveTutorSubjects = useSaveTutorSubjects();
  const saveStudentSubjects = useSaveStudentSubjects();
  const { data: tutorSubjects = [] } = useTutorSubjects();
  const { data: studentSubjects = [] } = useStudentSubjects();
  const { data: credentials = [] } = useTutorCredentials();
  const saveCredential = useSaveCredential();
  const deleteCredential = useDeleteCredential();

  const role = full?.profile.role ?? null;

  // --- stato comune -------------------------------------------------------
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoIsRemote, setPhotoIsRemote] = useState(true);
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  // --- stato tutor ------------------------------------------------------
  const [inPerson, setInPerson] = useState(true);
  const [online, setOnline] = useState(true);
  const [tUniversityName, setTUniversityName] = useState('');
  const [tDegreeCourse, setTDegreeCourse] = useState('');
  const [uniSubjects, setUniSubjects] = useState<string[]>([]);
  const [uniRange, setUniRange] = useState<[number, number]>([1, 5]);

  // --- stato studente -------------------------------------------------
  const [sUniversityName, setSUniversityName] = useState('');
  const [sDegreeCourse, setSDegreeCourse] = useState('');
  const [studentSubjectIds, setStudentSubjectIds] = useState<string[]>([]);
  const [studentLevel, setStudentLevel] = useState(1);

  const [newCred, setNewCred] = useState({ title: '', institution: '', year: '', request: true });
  const [showCredForm, setShowCredForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- idratazione --------------------------------------------------------
  useEffect(() => {
    if (!full) return;
    setFirstName(full.profile.first_name);
    setLastName(full.profile.last_name);
    setLocationLabel(full.profile.location_label ?? '');
    if (full.profile.location_lat != null && full.profile.location_lng != null) {
      setCoords({ lat: full.profile.location_lat, lng: full.profile.location_lng });
    }
    if (full.profile.avatar_url) {
      setPhoto(full.profile.avatar_url);
      setPhotoIsRemote(true);
    }
    if (full.tutorProfile) {
      setInPerson(full.tutorProfile.delivery_in_person);
      setOnline(full.tutorProfile.delivery_online);
      setTUniversityName(full.tutorProfile.university_name);
      setTDegreeCourse(full.tutorProfile.degree_course);
    }
    if (full.studentProfile) {
      setSUniversityName(full.studentProfile.university_name);
      setSDegreeCourse(full.studentProfile.degree_course);
    }
  }, [full]);

  useEffect(() => {
    const uni = tutorSubjects.filter((s) => s.school_context === 'university');
    if (uni.length) {
      setUniSubjects(uni.map((s) => s.subject_id));
      setUniRange([
        Math.min(...uni.map((s) => s.level_from)),
        Math.max(...uni.map((s) => s.level_to)),
      ]);
    }
  }, [tutorSubjects]);

  useEffect(() => {
    if (studentSubjects.length) {
      setStudentSubjectIds(studentSubjects.map((s) => s.subject_id));
      setStudentLevel(studentSubjects[0].level);
    }
  }, [studentSubjects]);

  const useMyLocation = async () => {
    try {
      setLocating(true);
      const place = await getCurrentPlace();
      setLocationLabel(place.label);
      setCoords(place.coords);
    } catch {
      Alert.alert('Posizione non disponibile', 'Inserisci la tua città manualmente.');
    } finally {
      setLocating(false);
    }
  };

  const onLocationBlur = async () => {
    if (!locationLabel.trim() || coords) return;
    const place = await geocodeText(locationLabel);
    if (place) {
      setLocationLabel(place.label);
      setCoords(place.coords);
    }
  };

  const toggleIn = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const addCredential = async () => {
    if (!newCred.title.trim()) return;
    await saveCredential.mutateAsync({
      title: newCred.title,
      institution: newCred.institution,
      year: newCred.year ? Number(newCred.year) : null,
      requestVerification: newCred.request,
    });
    setNewCred({ title: '', institution: '', year: '', request: true });
    setShowCredForm(false);
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !locationLabel.trim()) {
      Alert.alert('Campi mancanti', 'Nome, cognome e posizione sono obbligatori.');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = full?.profile.avatar_url ?? null;
      if (photo && !photoIsRemote && userId) avatarUrl = await uploadAvatar(userId, photo);
      else if (photo === null) avatarUrl = null;

      await updateProfile.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_url: avatarUrl,
        location_label: locationLabel.trim(),
        coords,
        ...(role === 'student' ? { school_context: 'university' as const } : null),
      });

      if (role === 'tutor') {
        await upsertTutor.mutateAsync({
          teaches_high_school: false,
          teaches_university: true,
          delivery_in_person: inPerson,
          delivery_online: online,
          university_name: tUniversityName.trim(),
          degree_course: tDegreeCourse.trim(),
        });
        await saveTutorSubjects.mutateAsync(
          uniSubjects.map((id) => ({
            subjectId: id,
            schoolContext: 'university' as const,
            levelFrom: uniRange[0],
            levelTo: uniRange[1],
          })),
        );
      }

      if (role === 'student') {
        await upsertStudent.mutateAsync({
          school_type: 'university',
          school_name: '',
          university_name: sUniversityName.trim(),
          degree_course: sDegreeCourse.trim(),
        });
        await saveStudentSubjects.mutateAsync(
          studentSubjectIds.map((id) => ({
            subjectId: id,
            schoolContext: 'university' as const,
            level: studentLevel,
          })),
        );
      }

      Alert.alert('Salvato', 'Il profilo è stato aggiornato.');
      router.back();
    } catch {
      Alert.alert('Ops', 'Non è stato possibile salvare tutte le modifiche. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const rangeCard = (
    ctx: SchoolContext,
    range: [number, number],
    setRange: (v: [number, number]) => void,
  ) => (
    <Card padding="md" style={styles.rangeCard}>
      <Text variant="label" tone="soft">
        LIVELLI COPERTI
      </Text>
      <View style={styles.rangeRow}>
        <NumberStepper
          value={range[0]}
          min={1}
          max={5}
          onChange={(v) => setRange([v, Math.max(v, range[1])])}
          format={(v) => levelLabel(ctx, v)}
        />
        <NumberStepper
          value={range[1]}
          min={1}
          max={5}
          onChange={(v) => setRange([Math.min(range[0], v), v])}
          format={(v) => levelLabel(ctx, v)}
        />
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xxxl }} />
      </Screen>
    );
  }

  return (
    <Screen scroll footer={<Button label="Salva modifiche" onPress={save} loading={saving} />}>
      <StepHeader title="Profilo" subtitle="Tutti i tuoi dati, sempre modificabili." onBack={() => router.back()} />

      <View style={styles.photo}>
        <PhotoPicker
          value={photo}
          name={`${firstName} ${lastName}`.trim()}
          onChange={(uri) => {
            setPhoto(uri);
            setPhotoIsRemote(false);
          }}
        />
      </View>

      <Section title="Dati personali">
        <TextField label="Nome" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <TextField label="Cognome" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <TextField
          label="Posizione"
          value={locationLabel}
          onChangeText={(v) => {
            setLocationLabel(v);
            setCoords(null);
          }}
          onBlur={onLocationBlur}
          iconLeft={<MapPin size={18} color={theme.textSoft} />}
        />
        <Pressable
          onPress={useMyLocation}
          disabled={locating}
          style={[styles.locBtn, { borderColor: theme.border }]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Navigation size={16} color={theme.primary} />
          )}
          <Text variant="label" tone="primary">
            Usa la mia posizione
          </Text>
        </Pressable>
      </Section>

      {role === 'tutor' ? (
        <>
          <Section title="Insegnamento">
            <ToggleRow label="In presenza" value={inPerson} onValueChange={setInPerson} />
            <ToggleRow label="Online" value={online} onValueChange={setOnline} />
          </Section>

          <Section title="Università">
            <TextField label="Ateneo" value={tUniversityName} onChangeText={setTUniversityName} />
            <TextField label="Corso di laurea" value={tDegreeCourse} onChangeText={setTDegreeCourse} />
          </Section>

          <Section title="Materie">
            {rangeCard('university', uniRange, setUniRange)}
            <SubjectPicker
              ctx="university"
              selected={uniSubjects}
              onToggle={(id) => toggleIn(uniSubjects, setUniSubjects, id)}
            />
          </Section>

          <Section title="Titoli di studio">
            {credentials.map((c) => (
              <Card key={c.id} padding="md" style={styles.credCard}>
                <View style={{ flex: 1, gap: 4 }}>
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
                <Pressable hitSlop={10} onPress={() => deleteCredential.mutate(c.id)}>
                  <Trash2 size={18} color={theme.textSoft} />
                </Pressable>
              </Card>
            ))}

            {showCredForm ? (
              <Card style={{ gap: spacing.md }}>
                <TextField
                  label="Titolo"
                  value={newCred.title}
                  onChangeText={(v) => setNewCred((s) => ({ ...s, title: v }))}
                />
                <TextField
                  label="Istituto / Ateneo"
                  value={newCred.institution}
                  onChangeText={(v) => setNewCred((s) => ({ ...s, institution: v }))}
                />
                <TextField
                  label="Anno"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={newCred.year}
                  onChangeText={(v) => setNewCred((s) => ({ ...s, year: v }))}
                />
                <ToggleRow
                  label="Richiedi la verifica"
                  value={newCred.request}
                  onValueChange={(v) => setNewCred((s) => ({ ...s, request: v }))}
                />
                <View style={styles.credActions}>
                  <Button label="Annulla" variant="ghost" fullWidth={false} onPress={() => setShowCredForm(false)} />
                  <Button label="Aggiungi" fullWidth={false} onPress={addCredential} loading={saveCredential.isPending} />
                </View>
              </Card>
            ) : (
              <Pressable
                onPress={() => setShowCredForm(true)}
                style={[styles.addBtn, { borderColor: theme.border }]}
              >
                <Plus size={18} color={theme.primary} />
                <Text variant="bodyStrong" tone="primary">
                  Aggiungi un titolo
                </Text>
              </Pressable>
            )}
          </Section>

          <Section title="Fiscalità">
            <Card padding="md" style={styles.fiscalCard}>
              <Info size={18} color={theme.textSoft} />
              <Text variant="caption" tone="soft" style={{ flex: 1 }}>
                Regime attuale: prestazione occasionale. Fino a {OCCASIONAL_INCOME_LIMIT_EUR.toLocaleString('it-IT')} € di
                compensi lordi all'anno puoi operare senza Partita IVA. Superata la soglia sarà
                richiesto l'inserimento della Partita IVA per continuare a ricevere pagamenti. La
                gestione dei pagamenti sarà attivata più avanti.
              </Text>
            </Card>
          </Section>
        </>
      ) : null}

      {role === 'student' ? (
        <>
          <Section title="Studi">
            <TextField label="Ateneo" value={sUniversityName} onChangeText={setSUniversityName} />
            <TextField
              label="Corso di laurea"
              value={sDegreeCourse}
              onChangeText={setSDegreeCourse}
              hint="Presto: ricerca tutor per singolo esame e docente."
            />
            <Card padding="md" style={styles.rangeCard}>
              <Text variant="label" tone="soft">
                IL TUO ANNO
              </Text>
              <NumberStepper
                value={studentLevel}
                min={1}
                max={5}
                onChange={setStudentLevel}
                format={(v) => levelLabel('university', v)}
              />
            </Card>
          </Section>

          <Section title="Materie da studiare">
            <SubjectPicker
              ctx="university"
              selected={studentSubjectIds}
              onToggle={(id) => toggleIn(studentSubjectIds, setStudentSubjectIds, id)}
            />
          </Section>
        </>
      ) : null}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: 'center', marginVertical: spacing.lg },
  section: { marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  sectionBody: { gap: spacing.md },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.pill,
  },
  rangeCard: { gap: spacing.sm, alignItems: 'flex-start' },
  rangeRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  credCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  credActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
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
  fiscalCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
