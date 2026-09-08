import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarPlus, Trash2, UserPlus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SegmentedControl,
  StepHeader,
  Text,
  TextField,
} from '@/components';
import { DayStrip } from '@/components/DayStrip';
import {
  useAddGroupMember,
  useAddGroupSession,
  useGroup,
  useRemoveGroupMember,
} from '@/features/groups/hooks';
import { useMyStudents } from '@/features/portfolio/hooks';
import { addMinutes, combineDayTime, formatFullDate, formatRange, nextDays } from '@/lib/datetime';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import type { SlotMode } from '@/types/database';

const TIMES = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export default function GruppoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: portfolio = [] } = useMyStudents();
  const addSession = useAddGroupSession();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const days = useMemo(() => nextDays(21), []);
  const [day, setDay] = useState(days[0]);
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<SlotMode>('online');
  const [topic, setTopic] = useState('');
  const [showSession, setShowSession] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xxxl }} />
      </Screen>
    );
  }
  if (!group) {
    return (
      <Screen>
        <StepHeader title="Classe" onBack={() => router.back()} />
        <EmptyState title="Classe non trovata" description="Potrebbe essere stata rimossa." />
      </Screen>
    );
  }

  const memberIds = new Set(group.members.map((m) => m.student_id));
  const addable = portfolio.filter((s) => !memberIds.has(s.student_id));

  const submitSession = async () => {
    if (!time) return;
    const startsAt = combineDayTime(day, time);
    try {
      await addSession.mutateAsync({ groupId: group.id, startsAt, endsAt: addMinutes(startsAt, 120), mode, topic });
      setTime(null);
      setTopic('');
      setShowSession(false);
    } catch {
      Alert.alert('Ops', 'Riprova.');
    }
  };

  return (
    <Screen scroll>
      <StepHeader title={group.name} subtitle={group.subject_name ?? undefined} onBack={() => router.back()} />

      {group.description ? (
        <Text variant="body" tone="soft" style={styles.desc}>
          {group.description}
        </Text>
      ) : null}
      {!group.is_owner ? (
        <Text variant="caption" tone="soft" style={styles.desc}>
          Tutor: {group.tutor_name}
        </Text>
      ) : null}

      {/* Membri */}
      <View style={styles.sectionHead}>
        <Text variant="heading">Studenti ({group.members.length})</Text>
        {group.is_owner ? (
          <Pressable onPress={() => setShowMembers((v) => !v)} style={styles.linkBtn}>
            <UserPlus size={14} color={theme.primary} />
            <Text variant="label" tone="primary">
              Aggiungi
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.members}>
        {group.members.map((m) => (
          <View key={m.student_id} style={[styles.memberRow, { borderColor: theme.border }]}>
            <Avatar uri={m.avatar_url} name={`${m.first_name} ${m.last_name}`} size={34} />
            <Text variant="body" style={{ flex: 1 }}>
              {m.first_name} {m.last_name}
              {m.external ? '  · esterno' : ''}
            </Text>
            {group.is_owner ? (
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert('Rimuovere?', `${m.first_name} verrà tolto dalla classe.`, [
                    { text: 'Annulla', style: 'cancel' },
                    {
                      text: 'Rimuovi',
                      style: 'destructive',
                      onPress: () => removeMember.mutate({ groupId: group.id, studentId: m.student_id }),
                    },
                  ])
                }
              >
                <Trash2 size={16} color={theme.textSoft} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {showMembers && group.is_owner ? (
        <Card style={styles.addCard}>
          <Text variant="label" tone="soft">
            DAL TUO PORTFOLIO
          </Text>
          {addable.length === 0 ? (
            <Text variant="caption" tone="soft">
              Tutti i tuoi studenti sono già nella classe. Per invitarne di esterni, condividi il
              link della classe (in arrivo).
            </Text>
          ) : (
            <View style={styles.chips}>
              {addable.map((s) => (
                <Chip
                  key={s.student_id}
                  label={`${s.first_name} ${s.last_name}`}
                  onPress={() =>
                    addMember.mutate({ groupId: group.id, studentId: s.student_id, external: false })
                  }
                />
              ))}
            </View>
          )}
        </Card>
      ) : null}

      {/* Sessioni */}
      <View style={styles.sectionHead}>
        <Text variant="heading">Sessioni</Text>
        {group.is_owner ? (
          <Pressable onPress={() => setShowSession((v) => !v)} style={styles.linkBtn}>
            <CalendarPlus size={14} color={theme.primary} />
            <Text variant="label" tone="primary">
              Pianifica
            </Text>
          </Pressable>
        ) : null}
      </View>

      {showSession && group.is_owner ? (
        <Card style={styles.addCard}>
          <Text variant="label" tone="soft">
            GIORNO
          </Text>
          <DayStrip days={days} value={day} onChange={setDay} />
          <Text variant="caption" tone="soft">
            {formatFullDate(day)}
          </Text>
          <Text variant="label" tone="soft">
            ORARIO
          </Text>
          <View style={styles.chips}>
            {TIMES.map((t) => (
              <Chip key={t} label={t} selected={t === time} onPress={() => setTime(t === time ? null : t)} />
            ))}
          </View>
          <SegmentedControl<SlotMode>
            value={mode}
            onChange={setMode}
            segments={[
              { value: 'online', label: 'Online' },
              { value: 'in_person', label: 'In presenza' },
              { value: 'both', label: 'Entrambe' },
            ]}
          />
          <TextField label="Argomento" placeholder="Es. Studio di funzione" value={topic} onChangeText={setTopic} />
          <Button label="Aggiungi sessione" onPress={submitSession} loading={addSession.isPending} disabled={!time} />
        </Card>
      ) : null}

      {group.sessions.length === 0 ? (
        <Text variant="caption" tone="soft" style={styles.desc}>
          Nessuna sessione pianificata.
        </Text>
      ) : (
        <View style={styles.members}>
          {group.sessions.map((se) => (
            <View key={se.id} style={[styles.memberRow, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{se.topic || 'Sessione'}</Text>
                <Text variant="caption" tone="soft">
                  {formatFullDate(se.starts_at)} · {formatRange(se.starts_at, se.ends_at)} ·{' '}
                  {se.mode === 'online' ? 'Online' : se.mode === 'in_person' ? 'In presenza' : 'In presenza / online'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { marginTop: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  members: { gap: spacing.sm },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  addCard: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
