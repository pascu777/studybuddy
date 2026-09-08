import { useRouter } from 'expo-router';
import { Siren } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  DayStrip,
  EmptyState,
  Screen,
  SegmentedControl,
  StepHeader,
  Text,
  TextField,
} from '@/components';
import {
  useCancelEmergency,
  useCreateEmergency,
  useMyEmergencies,
  useOfferEmergency,
  useOpenEmergencies,
  useRespondToOffer,
} from '@/features/emergency/hooks';
import { useSubjects } from '@/features/catalog/hooks';
import { useProfile } from '@/features/profile/hooks';
import { combineDayTime, formatDayShort, formatFullDate, formatTime, nextDays, relativeDay } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import type { BookingMode } from '@/types/database';

const TIMES = ['09:00', '11:00', '15:00', '17:00', '19:00', '21:00'];

export default function EmergenzaScreen() {
  const { data: full } = useProfile();
  return full?.profile.role === 'tutor' ? <TutorEmergency /> : <StudentEmergency />;
}

/* --------------------------- STUDENTE --------------------------- */
function StudentEmergency() {
  const theme = useTheme();
  const router = useRouter();
  const { data: full } = useProfile();
  const { data: subjects = [] } = useSubjects(full?.profile.school_context ?? undefined);
  const { data: mine = [], isLoading } = useMyEmergencies();
  const create = useCreateEmergency();
  const cancel = useCancelEmergency();
  const respond = useRespondToOffer();

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<BookingMode>('online');
  const [whenPref, setWhenPref] = useState('Il prima possibile');

  const submit = async () => {
    if (!note.trim()) {
      Alert.alert('Dettagli mancanti', 'Descrivi brevemente di cosa hai bisogno.');
      return;
    }
    try {
      await create.mutateAsync({ subjectId, note, mode, whenPref, broadcast: true });
      setNote('');
      Alert.alert('Richiesta inviata', 'I tuoi tutor e i tutor disponibili possono proporti un orario.');
    } catch {
      Alert.alert('Ops', 'Riprova.');
    }
  };

  return (
    <Screen scroll footer={<Button label="Invia richiesta d'emergenza" onPress={submit} loading={create.isPending} />}>
      <StepHeader
        title="Lezione d'emergenza"
        subtitle="Hai bisogno di aiuto fuori programma? Manda una richiesta: i tuoi tutor o tutor esterni possono proporti un orario."
        onBack={() => router.back()}
      />

      <Card style={styles.form}>
        <View style={styles.block}>
          <Text variant="label" tone="soft">
            MATERIA
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
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
          label="Cosa ti serve"
          placeholder="Es. Domani ho la verifica di fisica e non ho capito il moto parabolico"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          style={styles.textarea}
        />
        <View style={styles.block}>
          <Text variant="label" tone="soft">
            MODALITÀ
          </Text>
          <SegmentedControl<BookingMode>
            value={mode}
            onChange={setMode}
            segments={[
              { value: 'online', label: 'Online' },
              { value: 'in_person', label: 'In presenza' },
            ]}
          />
        </View>
        <TextField label="Quando" value={whenPref} onChangeText={setWhenPref} />
      </Card>

      <Text variant="heading" style={styles.h}>
        Le tue richieste
      </Text>
      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : mine.length === 0 ? (
        <Text variant="caption" tone="soft">
          Nessuna richiesta attiva.
        </Text>
      ) : (
        <View style={styles.list}>
          {mine.map((e) => (
            <Card key={e.id} style={styles.reqCard}>
              <View style={styles.reqHead}>
                <Text variant="bodyStrong">{e.subject_name ?? 'Lezione'}</Text>
                <Text variant="caption" tone={e.status === 'open' ? 'primary' : 'soft'}>
                  {e.status === 'open' ? 'In attesa di proposte' : e.status === 'matched' ? 'Abbinata' : 'Annullata'}
                </Text>
              </View>
              <Text variant="caption" tone="soft">
                “{e.note}” · {e.mode === 'online' ? 'Online' : 'In presenza'} · {e.when_pref}
              </Text>

              {e.offers.map((o) => (
                <View key={o.id} style={[styles.offer, { borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{o.tutor_name}</Text>
                    <Text variant="caption" tone="soft">
                      Propone: {formatDayShort(o.proposed_at)}, {formatTime(o.proposed_at)}
                      {o.status !== 'offered' ? ` · ${o.status === 'accepted' ? 'accettata' : 'rifiutata'}` : ''}
                    </Text>
                  </View>
                  {o.status === 'offered' && e.status === 'open' ? (
                    <View style={styles.offerActions}>
                      <Button
                        label="No"
                        variant="secondary"
                        fullWidth={false}
                        onPress={() => respond.mutate({ offerId: o.id, decision: 'declined' })}
                      />
                      <Button
                        label="Accetta"
                        fullWidth={false}
                        onPress={() => respond.mutate({ offerId: o.id, decision: 'accepted' })}
                      />
                    </View>
                  ) : null}
                </View>
              ))}

              {e.status === 'open' ? (
                <Button label="Annulla richiesta" variant="ghost" onPress={() => cancel.mutate(e.id)} />
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

/* ---------------------------- TUTOR ---------------------------- */
function TutorEmergency() {
  const theme = useTheme();
  const router = useRouter();
  const { data: open = [], isLoading } = useOpenEmergencies();
  const { data: mine = [] } = useMyEmergencies();
  const offer = useOfferEmergency();

  const days = useMemo(() => nextDays(7), []);
  const [target, setTarget] = useState<string | null>(null);
  const [day, setDay] = useState(days[0]);
  const [time, setTime] = useState<string | null>(null);

  const send = async (requestId: string) => {
    if (!time) {
      Alert.alert('Orario mancante', 'Scegli giorno e ora da proporre.');
      return;
    }
    try {
      await offer.mutateAsync({ requestId, proposedAt: combineDayTime(day, time), note: '' });
      setTarget(null);
      setTime(null);
    } catch {
      Alert.alert('Ops', 'Riprova.');
    }
  };

  return (
    <Screen scroll>
      <StepHeader
        title="Richieste d'emergenza"
        subtitle="Studenti che cercano aiuto fuori programma. Proponi un orario per accettare."
        onBack={() => router.back()}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : open.length === 0 ? (
        <EmptyState
          icon={<Siren size={28} color={theme.primary} />}
          title="Nessuna richiesta aperta"
          description="Quando uno studente invia una richiesta d'emergenza compare qui."
        />
      ) : (
        <View style={styles.list}>
          {open.map((e) => (
            <Card key={e.id} style={styles.reqCard}>
              <Text variant="bodyStrong">
                {e.student_name} · {e.subject_name ?? 'Lezione'}
              </Text>
              <Text variant="caption" tone="soft">
                “{e.note}” · {e.mode === 'online' ? 'Online' : 'In presenza'} · {e.when_pref} · {relativeDay(e.created_at)}
              </Text>

              {target === e.id ? (
                <View style={styles.proposeBox}>
                  <DayStrip days={days} value={day} onChange={setDay} />
                  <Text variant="caption" tone="soft">
                    {formatFullDate(day)}
                  </Text>
                  <View style={styles.chips}>
                    {TIMES.map((t) => (
                      <Chip key={t} label={t} selected={t === time} onPress={() => setTime(t === time ? null : t)} />
                    ))}
                  </View>
                  <View style={styles.offerActions}>
                    <Button label="Annulla" variant="ghost" fullWidth={false} onPress={() => setTarget(null)} />
                    <Button label="Proponi" fullWidth={false} onPress={() => send(e.id)} loading={offer.isPending} />
                  </View>
                </View>
              ) : (
                <Button label="Proponi un orario" variant="secondary" onPress={() => setTarget(e.id)} />
              )}
            </Card>
          ))}
        </View>
      )}

      {mine.length ? (
        <>
          <Text variant="heading" style={styles.h}>
            Le tue proposte
          </Text>
          <View style={styles.list}>
            {mine.map((e) => (
              <Card key={e.id} style={styles.reqCard}>
                <Text variant="bodyStrong">{e.subject_name ?? 'Lezione'}</Text>
                {e.offers
                  .filter((o) => o.tutor_name)
                  .map((o) => (
                    <Text key={o.id} variant="caption" tone="soft">
                      {formatDayShort(o.proposed_at)}, {formatTime(o.proposed_at)} —{' '}
                      {o.status === 'accepted' ? 'accettata ✓' : o.status === 'declined' ? 'rifiutata' : 'in attesa'}
                    </Text>
                  ))}
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  block: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingVertical: 2 },
  textarea: { minHeight: 72, textAlignVertical: 'top', paddingTop: spacing.sm },
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  loader: { marginVertical: spacing.xl },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  reqCard: { gap: spacing.sm },
  reqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: 12, padding: spacing.md },
  offerActions: { flexDirection: 'row', gap: spacing.xs },
  proposeBox: { gap: spacing.sm },
});
