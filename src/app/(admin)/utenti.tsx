import { useRouter } from 'expo-router';
import { Search, ShieldCheck, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Card,
  EmptyState,
  Screen,
  SegmentedControl,
  StepHeader,
  Text,
  TextField,
} from '@/components';
import { type AdminUserFilter, useAdminUsers, useSetTutorVerified } from '@/features/admin/hooks';
import type { AdminUserRow } from '@/types/database';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const FILTERS: { value: AdminUserFilter; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'student', label: 'Studenti' },
  { value: 'tutor', label: 'Tutor' },
];

function roleLabel(u: AdminUserRow): string {
  if (u.is_admin) return 'Amministratore';
  if (u.role === 'tutor') return 'Tutor';
  if (u.role === 'student') return 'Studente';
  return 'Registrazione in corso';
}

function UserRow({ item }: { item: AdminUserRow }) {
  const theme = useTheme();
  const setVerified = useSetTutorVerified();
  const name = `${item.first_name} ${item.last_name}`.trim() || 'Utente';
  const isTutor = item.role === 'tutor';

  const toggle = () =>
    setVerified.mutate(
      { tutorId: item.id, verified: !item.verified },
      {
        onError: (e) =>
          Alert.alert('Operazione non riuscita', e instanceof Error ? e.message : String(e)),
      },
    );

  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <Avatar uri={item.avatar_url} name={name} size={40} />
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="soft" numberOfLines={1}>
          {roleLabel(item)}
          {item.location_label ? ` · ${item.location_label}` : ''}
          {!item.onboarding_completed ? ' · onboarding incompleto' : ''}
        </Text>
      </View>

      {isTutor ? (
        <Pressable
          onPress={toggle}
          disabled={setVerified.isPending}
          style={[
            styles.pill,
            {
              backgroundColor: item.verified ? theme.successSoft : theme.surfaceAlt,
              borderColor: item.verified ? theme.success : theme.border,
            },
          ]}
        >
          <ShieldCheck size={12} color={item.verified ? theme.success : theme.textSoft} />
          <Text variant="caption" color={item.verified ? theme.success : theme.textSoft}>
            {item.verified ? 'Verificato' : 'Verifica'}
          </Text>
        </Pressable>
      ) : item.is_admin ? (
        <View style={[styles.pill, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
          <ShieldCheck size={12} color={theme.onPrimarySoft} />
          <Text variant="caption" color={theme.onPrimarySoft}>
            Admin
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function AdminUtenti() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AdminUserFilter>('all');
  const { data: users = [], isLoading } = useAdminUsers(query, filter);

  return (
    <Screen scroll>
      <StepHeader
        title="Utenti"
        subtitle="Cerca per nome o città e gestisci lo stato verificato dei tutor."
        onBack={() => router.back()}
      />

      <View style={styles.controls}>
        <TextField
          placeholder="Cerca utente…"
          value={query}
          onChangeText={setQuery}
          iconLeft={<Search size={18} color={theme.textSoft} />}
          autoCapitalize="none"
        />
        <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users size={28} color={theme.primary} />}
          title="Nessun utente"
          description="Nessun risultato per questa ricerca."
        />
      ) : (
        <Card padding="sm" style={styles.list}>
          {users.map((u) => (
            <UserRow key={u.id} item={u} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: spacing.sm, marginBottom: spacing.md },
  loader: { marginVertical: spacing.xxxl },
  list: { paddingBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
  },
  rowText: { flex: 1, gap: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
});
