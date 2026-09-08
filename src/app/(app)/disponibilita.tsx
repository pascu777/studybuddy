import { useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SegmentedControl,
  StepHeader,
  Text,
} from '@/components';
import { DayStrip } from '@/components/DayStrip';
import { useAddSlot, useDeleteSlot, useMyAvailability } from '@/features/availability/hooks';
import {
  addMinutes,
  combineDayTime,
  formatFullDate,
  formatRange,
  nextDays,
} from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import type { SlotMode } from '@/types/database';

const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const DURATIONS = [
  { value: 60, label: '1 ora' },
  { value: 90, label: '1h 30' },
  { value: 120, label: '2 ore' },
];

export default function DisponibilitaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading } = useMyAvailability();
  const addSlot = useAddSlot();
  const deleteSlot = useDeleteSlot();

  const days = useMemo(() => nextDays(21), []);
  const [day, setDay] = useState<Date>(days[0]);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState<SlotMode>('both');

  const slots = data?.slots ?? [];
  const bookingsBySlot = data?.bookingsBySlot ?? {};

  const grouped = useMemo(() => {
    const map = new Map<string, typeof slots>();
    for (const s of slots) {
      const k = s.starts_at.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.entries());
  }, [slots]);

  const add = async () => {
    if (!time) return;
    const startsAt = combineDayTime(day, time);
    if (startsAt.getTime() < Date.now()) {
      Alert.alert('Orario passato', 'Scegli un giorno e un orario futuri.');
      return;
    }
    try {
      await addSlot.mutateAsync({ startsAt, endsAt: addMinutes(startsAt, duration), mode });
      setTime(null);
    } catch {
      Alert.alert('Ops', 'Non è stato possibile aggiungere lo slot. Riprova.');
    }
  };

  const remove = (id: string, hasBooking: boolean) => {
    if (hasBooking) {
      Alert.alert('Slot prenotato', 'Non puoi eliminare uno slot con una richiesta o lezione attiva.');
      return;
    }
    deleteSlot.mutate(id);
  };

  return (
    <Screen scroll footer={<Button label="Aggiungi slot" onPress={add} loading={addSlot.isPending} disabled={!time} />}>
      <StepHeader
        title="La tua disponibilità"
        subtitle="Pubblica i tuoi slot: gli studenti potranno prenotarsi in queste fasce."
        onBack={() => router.back()}
      />

      <Card style={styles.form}>
        <View style={styles.block}>
          <Text variant="label" tone="soft">
            GIORNO
          </Text>
          <DayStrip days={days} value={day} onChange={setDay} />
          <Text variant="caption" tone="soft">
            {formatFullDate(day)}
          </Text>
        </View>

        <View style={styles.block}>
          <Text variant="label" tone="soft">
            ORARIO DI INIZIO
          </Text>
          <View style={styles.chips}>
            {TIMES.map((t) => (
              <Chip key={t} label={t} selected={t === time} onPress={() => setTime(t === time ? null : t)} />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text variant="label" tone="soft">
            DURATA
          </Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip key={d.value} label={d.label} selected={d.value === duration} onPress={() => setDuration(d.value)} />
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text variant="label" tone="soft">
            MODALITÀ
          </Text>
          <SegmentedControl<SlotMode>
            value={mode}
            onChange={setMode}
            segments={[
              { value: 'both', label: 'Entrambe' },
              { value: 'in_person', label: 'In presenza' },
              { value: 'online', label: 'Online' },
            ]}
          />
        </View>
      </Card>

      <Text variant="heading" style={styles.h}>
        Slot pubblicati
      </Text>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Plus size={26} color={theme.primary} />}
          title="Ancora nessuno slot"
          description="Aggiungi la prima fascia di disponibilità qui sopra."
        />
      ) : (
        <View style={styles.list}>
          {grouped.map(([k, list]) => (
            <View key={k} style={styles.dayGroup}>
              <Text variant="label" tone="soft">
                {formatFullDate(list[0].starts_at)}
              </Text>
              {list.map((s) => {
                const b = bookingsBySlot[s.id];
                const state = b?.status === 'confirmed' ? 'Confermato' : b?.status === 'pending' ? 'Richiesta in attesa' : 'Libero';
                return (
                  <View key={s.id} style={[styles.slotRow, { borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{formatRange(s.starts_at, s.ends_at)}</Text>
                      <Text variant="caption" tone={b ? 'primary' : 'soft'}>
                        {state} · {s.mode === 'online' ? 'Online' : s.mode === 'in_person' ? 'In presenza' : 'In presenza / online'}
                      </Text>
                    </View>
                    <Pressable hitSlop={10} onPress={() => remove(s.id, !!b)}>
                      <Trash2 size={17} color={b ? theme.border : theme.textSoft} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  block: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  loader: { marginVertical: spacing.xxl },
  list: { gap: spacing.lg, paddingBottom: spacing.xl },
  dayGroup: { gap: spacing.sm },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
