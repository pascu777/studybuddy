import { useRouter } from 'expo-router';
import { CalendarPlus, ChevronRight, Siren, UserMinus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  BookingCard,
  Button,
  Card,
  EmptyState,
  InlineTabs,
  Screen,
  Text,
} from '@/components';
import { useCancelBooking, useMyBookings, useRespondToBooking } from '@/features/bookings/hooks';
import { useOpenConversation } from '@/features/chat/hooks';
import { useMyStudents, useMyTutors, useRemoveStudent } from '@/features/portfolio/hooks';
import { useProfile } from '@/features/profile/hooks';
import { relativeDay } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import type { MyBookingRow } from '@/types/database';

function useChatOpener() {
  const router = useRouter();
  const { data: full } = useProfile();
  const open = useOpenConversation();
  return async (b: MyBookingRow) => {
    const tutorId = b.role === 'student' ? b.counterpart_id : full?.profile.id;
    const studentId = b.role === 'student' ? full?.profile.id : b.counterpart_id;
    if (!tutorId || !studentId) return;
    try {
      const conv = await open.mutateAsync({ tutorId, studentId });
      router.push({
        pathname: '/(app)/chat/[id]',
        params: { id: conv.id, name: `${b.counterpart_first_name} ${b.counterpart_last_name}` },
      });
    } catch {
      /* noop */
    }
  };
}

const isUpcoming = (b: MyBookingRow) => new Date(b.ends_at).getTime() > Date.now() - 3_600_000;

export default function LezioniScreen() {
  const { data: full } = useProfile();
  const isTutor = full?.profile.role === 'tutor';
  return isTutor ? <TutorLessons /> : <StudentLessons />;
}

/* -------------------------------------------------------------------------- */
/*  Studente                                                                  */
/* -------------------------------------------------------------------------- */
function StudentLessons() {
  const theme = useTheme();
  const router = useRouter();
  const { data: bookings = [], isLoading } = useMyBookings();
  const { data: tutors = [] } = useMyTutors();
  const cancel = useCancelBooking();
  const openChat = useChatOpener();

  const upcoming = bookings.filter((b) => b.status === 'confirmed' && isUpcoming(b));
  const requests = bookings.filter((b) => b.status === 'pending');
  const [tab, setTab] = useState<'upcoming' | 'requests' | 'tutors'>('upcoming');

  const doCancel = (id: string) =>
    Alert.alert('Annullare?', 'La lezione verrà annullata.', [
      { text: 'No', style: 'cancel' },
      { text: 'Annulla lezione', style: 'destructive', onPress: () => cancel.mutate(id) },
    ]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title">Lezioni</Text>
        <Pressable onPress={() => router.push('/(app)/emergenza')} style={styles.manageBtn}>
          <Siren size={15} color={theme.primary} />
          <Text variant="label" tone="primary">
            Emergenza
          </Text>
        </Pressable>
      </View>

      <InlineTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'upcoming', label: 'Prossime', count: upcoming.length },
          { value: 'requests', label: 'Richieste', count: requests.length },
          { value: 'tutors', label: 'I miei tutor', count: tutors.length },
        ]}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : tab === 'tutors' ? (
        tutors.length === 0 ? (
          <EmptyState
            title="Nessun tutor ancora"
            description="Quando un tutor accetta una tua richiesta lo trovi qui."
            action={<Button label="Trova un tutor" onPress={() => router.push('/(app)/cerca')} />}
          />
        ) : (
          <View style={styles.list}>
            {tutors.map((t) => (
              <Card
                key={t.tutor_id}
                onPress={() => router.push({ pathname: '/(app)/tutor/[id]', params: { id: t.tutor_id } })}
                style={styles.personRow}
              >
                <Avatar uri={t.avatar_url} name={`${t.first_name} ${t.last_name}`} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">
                    {t.first_name} {t.last_name}
                  </Text>
                  <Text variant="caption" tone="soft">
                    {t.verified ? 'Verificato · ' : ''}dal {relativeDay(t.since).toLowerCase()}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textSoft} />
              </Card>
            ))}
          </View>
        )
      ) : tab === 'requests' ? (
        requests.length === 0 ? (
          <EmptyState title="Nessuna richiesta in attesa" description="Le richieste che invii ai tutor compaiono qui." />
        ) : (
          <View style={styles.list}>
            {requests.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                footer={
                  <Button label="Annulla richiesta" variant="secondary" onPress={() => doCancel(b.id)} />
                }
              />
            ))}
          </View>
        )
      ) : upcoming.length === 0 ? (
        <EmptyState
          title="Nessuna lezione in programma"
          description="Prenota una lezione con un tutor per vederla qui."
          action={<Button label="Trova un tutor" onPress={() => router.push('/(app)/cerca')} />}
        />
      ) : (
        <View style={styles.list}>
          {upcoming.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              footer={
                <>
                  <Button
                    label="Scrivi"
                    variant="secondary"
                    fullWidth={false}
                    style={styles.flex1}
                    onPress={() => openChat(b)}
                  />
                  <Button
                    label="Annulla"
                    variant="secondary"
                    fullWidth={false}
                    style={styles.flex1}
                    onPress={() => doCancel(b.id)}
                  />
                </>
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tutor                                                                     */
/* -------------------------------------------------------------------------- */
function TutorLessons() {
  const theme = useTheme();
  const router = useRouter();
  const { data: bookings = [], isLoading } = useMyBookings();
  const { data: students = [] } = useMyStudents();
  const respond = useRespondToBooking();
  const removeStudent = useRemoveStudent();
  const openChat = useChatOpener();

  const doRespond = async (id: string, decision: 'confirmed' | 'declined') => {
    try {
      await respond.mutateAsync({ id, decision });
    } catch (e) {
      Alert.alert(
        'Non riuscito',
        e instanceof Error && /soglia|partita iva/i.test(e.message)
          ? 'Hai superato la soglia annua della prestazione occasionale: inserisci la Partita IVA in Compensi per confermare lezioni a pagamento.'
          : 'Riprova tra un momento.',
      );
    }
  };

  const requests = bookings.filter((b) => b.status === 'pending');
  const scheduled = bookings.filter((b) => b.status === 'confirmed' && isUpcoming(b));
  const [tab, setTab] = useState<'requests' | 'scheduled' | 'students'>('requests');

  const doRemove = (id: string, name: string) =>
    Alert.alert('Rimuovere dallo studio?', `${name} non potrà più prenotare con te finché non lo riaccetti.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: () => removeStudent.mutate(id) },
    ]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title">Lezioni</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/(app)/emergenza')} style={styles.manageBtn}>
            <Siren size={15} color={theme.primary} />
            <Text variant="label" tone="primary">
              Emergenze
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/disponibilita')} style={styles.manageBtn}>
            <CalendarPlus size={15} color={theme.primary} />
            <Text variant="label" tone="primary">
              Disponibilità
            </Text>
          </Pressable>
        </View>
      </View>

      <InlineTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'requests', label: 'Richieste', count: requests.length },
          { value: 'scheduled', label: 'In programma', count: scheduled.length },
          { value: 'students', label: 'Studenti', count: students.length },
        ]}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : tab === 'students' ? (
        students.length === 0 ? (
          <EmptyState title="Nessuno studente" description="Gli studenti entrano nel tuo portfolio quando accetti una loro richiesta." />
        ) : (
          <View style={styles.list}>
            {students.map((s) => (
              <Card key={s.student_id} style={styles.personRow}>
                <Avatar uri={s.avatar_url} name={`${s.first_name} ${s.last_name}`} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">
                    {s.first_name} {s.last_name}
                  </Text>
                  <Text variant="caption" tone="soft">
                    {s.lessons_count} {s.lessons_count === 1 ? 'lezione' : 'lezioni'}
                    {s.location_label ? ` · ${s.location_label}` : ''}
                  </Text>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => doRemove(s.student_id, s.first_name)}
                  style={styles.removeBtn}
                >
                  <UserMinus size={16} color={theme.danger} />
                </Pressable>
              </Card>
            ))}
          </View>
        )
      ) : tab === 'scheduled' ? (
        scheduled.length === 0 ? (
          <EmptyState title="Niente in programma" description="Le lezioni confermate compaiono qui." />
        ) : (
          <View style={styles.list}>
            {scheduled.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                footer={<Button label="Scrivi allo studente" variant="secondary" onPress={() => openChat(b)} />}
              />
            ))}
          </View>
        )
      ) : requests.length === 0 ? (
        <EmptyState
          title="Nessuna richiesta"
          description="Pubblica altra disponibilità per ricevere prenotazioni dagli studenti."
          action={<Button label="Gestisci disponibilità" onPress={() => router.push('/(app)/disponibilita')} />}
        />
      ) : (
        <View style={styles.list}>
          {requests.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              footer={
                <>
                  <Button
                    label="Rifiuta"
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => doRespond(b.id, 'declined')}
                    style={styles.flex1}
                  />
                  <Button
                    label="Accetta"
                    fullWidth={false}
                    onPress={() => doRespond(b.id, 'confirmed')}
                    style={styles.flex1}
                  />
                </>
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  loader: { marginVertical: spacing.xxl },
  list: { gap: spacing.md, marginTop: spacing.md, paddingBottom: spacing.xl },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  removeBtn: { padding: spacing.xs },
  flex1: { flex: 1 },
});
