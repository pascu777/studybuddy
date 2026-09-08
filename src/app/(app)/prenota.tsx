import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  DayStrip,
  EmptyState,
  PriceBreakdown,
  Screen,
  SegmentedControl,
  SlotPill,
  StepHeader,
  Text,
  TextField,
} from '@/components';
import { useTutorSlots } from '@/features/availability/hooks';
import { useCreateBooking } from '@/features/bookings/hooks';
import { useSubjects } from '@/features/catalog/hooks';
import { usePlatformConfig } from '@/features/payments/hooks';
import { useTutor } from '@/features/search/hooks';
import { formatFullDate, sameDay } from '@/lib/datetime';
import { commissionCents, priceForDuration } from '@/lib/money';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import type { BookingMode, TutorSlotRow } from '@/types/database';

export default function PrenotaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tutorId } = useLocalSearchParams<{ tutorId: string }>();

  const { data: tutor } = useTutor(tutorId);
  const { data: slots = [], isLoading } = useTutorSlots(tutorId);
  const { data: catalog = [] } = useSubjects();
  const { data: config } = usePlatformConfig();
  const createBooking = useCreateBooking();

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<TutorSlotRow | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [mode, setMode] = useState<BookingMode>('online');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const bookable = slots.filter((s) => s.status === 'free' || s.mine);
  const days = useMemo(() => {
    const uniq: Date[] = [];
    for (const s of bookable) {
      const d = new Date(s.starts_at);
      d.setHours(0, 0, 0, 0);
      if (!uniq.some((x) => sameDay(x, d))) uniq.push(d);
    }
    return uniq;
  }, [bookable]);

  const activeDay = selectedDay ?? days[0] ?? null;
  const daySlots = activeDay ? bookable.filter((s) => sameDay(s.starts_at, activeDay)) : [];

  const tutorSubjects = useMemo(() => {
    const names = new Set(tutor?.subjects ?? []);
    return catalog.filter((c) => names.has(c.name));
  }, [tutor?.subjects, catalog]);

  const minutes = slot
    ? Math.round((new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60000)
    : 0;
  const hourly = tutor?.hourly_rate_cents ?? 0;
  const priceCents = hourly ? priceForDuration(hourly, minutes) : 0;
  const commCents = commissionCents(priceCents, config?.commission_rate ?? 0.1);

  const selectSlot = (s: TutorSlotRow) => {
    if (s.mine) return;
    setSlot(s);
    setError(null);
    setMode(s.mode === 'in_person' ? 'in_person' : 'online');
  };

  const submit = async () => {
    if (!slot || !tutorId) return;
    setError(null);
    try {
      await createBooking.mutateAsync({
        slotId: slot.id,
        tutorId,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        mode,
        subjectId,
        message,
        priceCents,
        commissionCents: commCents,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invio non riuscito. Riprova.');
    }
  };

  if (done) {
    return (
      <Screen footer={<Button label="Torna alle lezioni" onPress={() => router.replace('/(app)/lezioni')} />}>
        <View style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: theme.successSoft }]}>
            <CheckCircle2 size={32} color={theme.success} />
          </View>
          <Text variant="title" center>
            Richiesta inviata
          </Text>
          <Text variant="body" tone="soft" center style={styles.doneText}>
            {tutor ? `${tutor.first_name} ` : 'Il tutor '}
            riceverà la tua richiesta e potrà accettarla. La trovi in “Lezioni · Richieste”.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          label="Invia richiesta"
          onPress={submit}
          loading={createBooking.isPending}
          disabled={!slot}
        />
      }
    >
      <StepHeader
        title="Prenota lezione"
        subtitle={tutor ? `Con ${tutor.first_name} ${tutor.last_name}` : undefined}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : bookable.length === 0 ? (
        <EmptyState
          title="Nessuno slot disponibile"
          description="Questo tutor non ha ancora pubblicato disponibilità. Riprova più tardi."
        />
      ) : (
        <>
          <Text variant="label" tone="soft" style={styles.lbl}>
            SCEGLI IL GIORNO
          </Text>
          <DayStrip days={days} value={activeDay ?? days[0]} onChange={(d) => { setSelectedDay(d); setSlot(null); }} />

          {activeDay ? (
            <Text variant="caption" tone="soft" style={styles.dayLabel}>
              {formatFullDate(activeDay)}
            </Text>
          ) : null}

          <View style={styles.slots}>
            {daySlots.map((s) => (
              <SlotPill
                key={s.id}
                startsAt={s.starts_at}
                endsAt={s.ends_at}
                mode={s.mode}
                state={s.mine ? 'mine' : slot?.id === s.id ? 'selected' : 'free'}
                onPress={() => selectSlot(s)}
              />
            ))}
          </View>

          {slot ? (
            <Card style={styles.form}>
              {tutorSubjects.length ? (
                <View style={styles.block}>
                  <Text variant="label" tone="soft">
                    MATERIA
                  </Text>
                  <View style={styles.chips}>
                    {tutorSubjects.map((s) => (
                      <Chip
                        key={s.id}
                        label={s.name}
                        selected={s.id === subjectId}
                        onPress={() => setSubjectId(s.id === subjectId ? null : s.id)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {slot.mode === 'both' ? (
                <View style={styles.block}>
                  <Text variant="label" tone="soft">
                    MODALITÀ
                  </Text>
                  <SegmentedControl<BookingMode>
                    value={mode}
                    onChange={setMode}
                    segments={[
                      { value: 'in_person', label: 'In presenza' },
                      { value: 'online', label: 'Online' },
                    ]}
                  />
                </View>
              ) : null}

              <TextField
                label="Messaggio per il tutor (facoltativo)"
                placeholder="Es. Vorrei preparare la verifica di venerdì"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                style={styles.textarea}
              />

              {priceCents > 0 ? (
                <PriceBreakdown priceCents={priceCents} commissionCents={commCents} minutes={minutes} />
              ) : null}

              {error ? (
                <Text variant="caption" tone="danger">
                  {error}
                </Text>
              ) : null}
            </Card>
          ) : (
            <Text variant="caption" tone="soft" style={styles.hint}>
              Seleziona uno slot per continuare.
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.xxl },
  lbl: { marginTop: spacing.sm, marginBottom: spacing.sm },
  dayLabel: { marginTop: spacing.sm },
  slots: { gap: spacing.sm, marginTop: spacing.sm },
  form: { gap: spacing.lg, marginTop: spacing.lg },
  block: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  textarea: { minHeight: 72, textAlignVertical: 'top', paddingTop: spacing.sm },
  hint: { marginTop: spacing.lg },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  doneIcon: { width: 76, height: 76, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  doneText: { maxWidth: 320 },
});
