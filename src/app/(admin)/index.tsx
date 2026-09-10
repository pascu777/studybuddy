import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Siren,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, ListRow, Screen, StatTile, Text } from '@/components';
import { useAdminOverview } from '@/features/admin/hooks';
import { adminRoutes } from '@/features/admin/routes';
import { useSignOut } from '@/features/auth/hooks';
import { useProfile } from '@/features/profile/hooks';
import { demoActAs, DEMO_STUDENT_ID } from '@/lib/demo/client';
import { DEMO_MODE } from '@/lib/env';
import { formatEUR } from '@/lib/money';
import { queryClient } from '@/lib/query-client';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { data: full } = useProfile();
  const { data: ov, isLoading } = useAdminOverview();
  const signOut = useSignOut();

  const canOpenApp = !!full?.profile.onboarding_completed_at;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
          <ShieldCheck size={14} color={theme.onPrimarySoft} />
          <Text variant="caption" color={theme.onPrimarySoft}>
            Amministrazione
          </Text>
        </View>
        <Text variant="title">Pannello di controllo</Text>
        <Text variant="body" tone="soft">
          Verifica i titoli dei tutor e tieni d'occhio la piattaforma.
        </Text>
      </View>

      {isLoading || !ov ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.stats}>
            <StatTile
              value={ov.credentials_pending}
              label="Titoli da verificare"
              icon={<BadgeCheck size={16} color={theme.primaryText} />}
              highlight={ov.credentials_pending > 0}
            />
            <StatTile
              value={ov.tutors_verified}
              label="Tutor verificati"
              icon={<ShieldCheck size={16} color={theme.textSoft} />}
            />
            <StatTile value={ov.users_total} label="Utenti totali" icon={<Users size={16} color={theme.textSoft} />} />
          </View>

          <View style={styles.stats}>
            <StatTile
              value={formatEUR(ov.gmv_cents)}
              label="Volume lezioni"
              icon={<TrendingUp size={16} color={theme.textSoft} />}
            />
            <StatTile
              value={formatEUR(ov.commission_cents)}
              label="Commissioni"
              icon={<TrendingUp size={16} color={theme.textSoft} />}
            />
            <StatTile
              value={ov.bookings_upcoming}
              label="Lezioni in programma"
              icon={<CalendarClock size={16} color={theme.textSoft} />}
            />
          </View>

          <View style={styles.stats}>
            <StatTile value={ov.students_total} label="Studenti" icon={<GraduationCap size={16} color={theme.textSoft} />} />
            <StatTile value={ov.tutors_total} label="Tutor" icon={<Users size={16} color={theme.textSoft} />} />
            <StatTile value={ov.emergencies_open} label="Emergenze aperte" icon={<Siren size={16} color={theme.textSoft} />} />
          </View>

          <Card padding="sm" style={styles.list}>
            <ListRow
              icon={<BadgeCheck size={18} color={theme.textSoft} />}
              title="Verifiche titoli"
              subtitle="Coda delle richieste di verifica"
              badge={ov.credentials_pending > 0 ? String(ov.credentials_pending) : undefined}
              onPress={() => router.push(adminRoutes.verifiche)}
            />
            <ListRow
              icon={<Users size={18} color={theme.textSoft} />}
              title="Utenti"
              subtitle="Cerca, filtra e gestisci lo stato verificato"
              onPress={() => router.push(adminRoutes.utenti)}
            />
          </Card>

          {canOpenApp ? (
            <Card padding="sm" style={styles.list}>
              <ListRow
                icon={<ArrowLeftRight size={18} color={theme.textSoft} />}
                title="Vai all'app"
                subtitle="Apri l'esperienza utente"
                onPress={() => router.replace('/(app)/home')}
              />
            </Card>
          ) : null}

          {DEMO_MODE ? (
            <Card style={styles.demoCard}>
              <Text variant="label" tone="soft">
                MODALITÀ DEMO
              </Text>
              <Text variant="caption" tone="soft">
                Stai vedendo il pannello con dati di esempio. Torna al profilo studente per
                esplorare il resto dell'app.
              </Text>
              <Button
                label="Esci dal pannello"
                variant="secondary"
                onPress={() => {
                  demoActAs(DEMO_STUDENT_ID);
                  queryClient.clear();
                  router.replace('/(app)/home');
                }}
              />
            </Card>
          ) : (
            <Card padding="sm">
              <ListRow
                icon={<LogOut size={18} color={theme.danger} />}
                title="Esci"
                danger
                showChevron={false}
                onPress={() => signOut.mutate()}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, gap: spacing.xs, marginBottom: spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: spacing.xs,
  },
  loader: { marginVertical: spacing.xxxl },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  list: { marginTop: spacing.sm },
  demoCard: { gap: spacing.sm, marginTop: spacing.md },
});
