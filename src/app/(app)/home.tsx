import { useRouter } from 'expo-router';
import { CalendarClock, CalendarPlus, Inbox, Search, Siren, Sparkles, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookingCard, Card, CategoryTile, Screen, StatTile, Text } from '@/components';
import { useMyAvailability } from '@/features/availability/hooks';
import { useMyBookings } from '@/features/bookings/hooks';
import { useSubjects } from '@/features/catalog/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const { data: full } = useProfile();
  return full?.profile.role === 'tutor' ? <TutorHome /> : <StudentHome />;
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.quick, { borderColor: theme.border, backgroundColor: theme.surface }]}
    >
      {icon}
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
function StudentHome() {
  const theme = useTheme();
  const router = useRouter();
  const { data: full } = useProfile();
  const ctx = full?.profile.school_context ?? undefined;
  const name = full?.profile.first_name ?? '';
  const { data: subjects = [] } = useSubjects(ctx);
  const featured = useMemo(() => subjects.slice(0, 8), [subjects]);

  return (
    <Screen scroll padded={false}>
      <View style={styles.header}>
        <Text variant="label" tone="soft" style={styles.greet}>
          Ciao {name} 👋
        </Text>
        <Text variant="title">Trova il tuo tutor</Text>
      </View>

      <View style={styles.body}>
        <Card onPress={() => router.push('/(app)/cerca')} style={styles.searchBar} padding="md" elevated={false}>
          <Search size={18} color={theme.textSoft} />
          <Text variant="body" tone="soft">
            Cerca materia o argomento…
          </Text>
        </Card>

        <View style={styles.quickRow}>
          <QuickLink icon={<Siren size={16} color={theme.primary} />} label="Emergenza" onPress={() => router.push('/(app)/emergenza')} />
          <QuickLink icon={<Users size={16} color={theme.primary} />} label="Classi" onPress={() => router.push('/(app)/gruppi')} />
        </View>

        <View style={styles.sectionHead}>
          <Sparkles size={16} color={theme.primary} />
          <Text variant="heading">Materie più richieste</Text>
        </View>

        <View style={styles.tiles}>
          {featured.map((s) => (
            <CategoryTile
              key={s.id}
              name={s.name}
              area={s.area}
              accent={s.accent}
              subtitle={ctx === 'university' ? 'Università' : ctx === 'high_school' ? 'Scuole superiori' : s.area}
              onPress={() => router.push({ pathname: '/(app)/cerca', params: { subject: s.id } })}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
function TutorHome() {
  const router = useRouter();
  const theme = useTheme();
  const { data: full } = useProfile();
  const name = full?.profile.first_name ?? '';
  const { data: bookings = [] } = useMyBookings();
  const { data: avail } = useMyAvailability();

  const pending = bookings.filter((b) => b.status === 'pending').length;
  const scheduled = bookings
    .filter((b) => b.status === 'confirmed' && new Date(b.ends_at).getTime() > Date.now() - 3_600_000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const freeSlots = avail
    ? avail.slots.filter((s) => !avail.bookingsBySlot[s.id]).length
    : 0;

  return (
    <Screen scroll>
      <View style={styles.tutorHeader}>
        <Text variant="label" tone="soft" style={styles.greet}>
          Ciao {name} 👋
        </Text>
        <Text variant="title">La tua agenda</Text>
      </View>

      <View style={styles.stats}>
        <StatTile value={pending} label="Richieste in attesa" icon={<Inbox size={16} color={theme.primaryText} />} highlight={pending > 0} />
        <StatTile value={scheduled.length} label="Lezioni in programma" icon={<CalendarClock size={16} color={theme.textSoft} />} />
        <StatTile value={freeSlots} label="Slot liberi" icon={<CalendarPlus size={16} color={theme.textSoft} />} />
      </View>

      <View style={styles.quickRow}>
        <QuickLink icon={<CalendarPlus size={16} color={theme.primary} />} label="Disponibilità" onPress={() => router.push('/(app)/disponibilita')} />
        <QuickLink icon={<Users size={16} color={theme.primary} />} label="Classi" onPress={() => router.push('/(app)/gruppi')} />
        <QuickLink icon={<Siren size={16} color={theme.primary} />} label="Emergenze" onPress={() => router.push('/(app)/emergenza')} />
      </View>

      <Text variant="heading" style={styles.nextH}>
        Prossima lezione
      </Text>
      {scheduled.length ? (
        <BookingCard booking={scheduled[0]} />
      ) : (
        <Card>
          <Text variant="body" tone="soft">
            Nessuna lezione confermata. Le nuove richieste degli studenti arrivano in “Lezioni”.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: 2 },
  tutorHeader: { paddingTop: spacing.lg, gap: 2, marginBottom: spacing.md },
  greet: { textTransform: 'none', fontSize: 12 },
  body: { padding: spacing.xl, gap: spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderRadius: 14,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  tiles: { gap: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm },
  manage: { marginTop: spacing.md },
  nextH: { marginTop: spacing.xl, marginBottom: spacing.md },
});
