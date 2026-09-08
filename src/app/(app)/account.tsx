import { useRouter } from 'expo-router';
import {
  Bell,
  CreditCard,
  GraduationCap,
  LogOut,
  type LucideIcon,
  Settings2,
  ShieldCheck,
  Siren,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, ListRow, Screen, Text } from '@/components';
import { useSignOut } from '@/features/auth/hooks';
import { useSession } from '@/features/auth/session-provider';
import { useUnreadNotifications } from '@/features/notifications/hooks';
import { useProfile } from '@/features/profile/hooks';
import { demoSwitchRole } from '@/lib/demo/client';
import { DEMO_MODE } from '@/lib/env';
import { queryClient } from '@/lib/query-client';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { data: full } = useProfile();
  const signOut = useSignOut();
  const unread = useUnreadNotifications();

  const profile = full?.profile;
  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : '';
  const isTutor = profile?.role === 'tutor';
  const verified = full?.tutorProfile?.verified;

  const confirmSignOut = () => {
    Alert.alert('Esci', 'Vuoi uscire dal tuo account?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => signOut.mutate() },
    ]);
  };

  const icon = (Icon: LucideIcon) => <Icon size={18} color={theme.textSoft} />;

  return (
    <Screen scroll>
      <Card style={styles.headerCard}>
        <Avatar uri={profile?.avatar_url} name={fullName} size={56} />
        <View style={styles.headerText}>
          <Text variant="heading" numberOfLines={1}>
            Ciao, {profile?.first_name || 'utente'} 👋
          </Text>
          <Text variant="caption" tone="soft" numberOfLines={1}>
            {session?.user.email}
          </Text>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: theme.primarySoft }]}>
              <Text variant="caption" color={theme.onPrimarySoft}>
                {isTutor ? 'Tutor' : 'Studente'}
              </Text>
            </View>
            {isTutor ? (
              <View style={[styles.tag, { backgroundColor: verified ? theme.successSoft : theme.surfaceAlt }]}>
                <ShieldCheck size={12} color={verified ? theme.success : theme.textSoft} />
                <Text variant="caption" tone="soft">
                  {verified ? 'Verificato' : 'Non verificato'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable onPress={() => router.push('/(app)/notifiche-centro')} style={styles.bell} hitSlop={8}>
          <Bell size={20} color={theme.text} />
          {unread > 0 ? (
            <View style={[styles.bellDot, { backgroundColor: theme.primary, borderColor: theme.surface }]}>
              <Text variant="caption" color={theme.primaryText} style={styles.bellCount}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Card>

      <Card padding="sm" style={styles.list}>
        <ListRow
          icon={icon(UserRound)}
          title="Profilo"
          subtitle="Dati personali, foto, posizione"
          onPress={() => router.push('/(app)/profilo')}
        />
        <ListRow
          icon={icon(GraduationCap)}
          title={isTutor ? 'Materie, titoli ed esami' : 'I miei studi'}
          subtitle="Modifica materie, livelli e ambito"
          onPress={() => router.push('/(app)/profilo')}
        />
        <ListRow
          icon={icon(Users)}
          title="Classi di gruppo"
          subtitle={isTutor ? 'Crea e gestisci le tue classi' : 'Le classi a cui partecipi'}
          onPress={() => router.push('/(app)/gruppi')}
        />
        {isTutor ? (
          <ListRow
            icon={icon(Wallet)}
            title="Compensi"
            subtitle="Guadagni, tariffa e Partita IVA"
            onPress={() => router.push('/(app)/compensi')}
          />
        ) : (
          <ListRow
            icon={icon(Siren)}
            title="Lezione d'emergenza"
            subtitle="Richiedi aiuto fuori programma"
            onPress={() => router.push('/(app)/emergenza')}
          />
        )}
        <ListRow icon={icon(CreditCard)} title="Metodi di pagamento" badge="Presto" showChevron={false} />
        <ListRow
          icon={icon(Bell)}
          title="Notifiche"
          subtitle="Permessi push del dispositivo"
          onPress={() => router.push('/(app)/notifiche')}
        />
        <ListRow
          icon={icon(Settings2)}
          title="Preferenze"
          subtitle="Tema e lingua"
          onPress={() => router.push('/(app)/preferenze')}
        />
      </Card>

      {DEMO_MODE ? (
        <Card style={styles.demoCard}>
          <Text variant="label" tone="soft">
            MODALITÀ DEMO
          </Text>
          <Text variant="caption" tone="soft">
            Stai usando dati di esempio in memoria. Cambia ruolo per esplorare l'altra parte
            dell'app.
          </Text>
          <Button
            label={isTutor ? 'Passa a studente' : 'Passa a tutor'}
            variant="secondary"
            onPress={() => {
              demoSwitchRole();
              queryClient.clear();
              router.replace('/(app)/home');
            }}
          />
        </Card>
      ) : null}

      <Card padding="sm">
        <ListRow
          icon={<LogOut size={18} color={theme.danger} />}
          title="Esci"
          danger
          showChevron={false}
          onPress={confirmSignOut}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerText: { flex: 1, gap: 3 },
  tags: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  bell: { padding: spacing.xs },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellCount: { fontSize: 9, lineHeight: 12 },
  list: { marginBottom: spacing.md },
  demoCard: { gap: spacing.sm, marginBottom: spacing.md },
});
