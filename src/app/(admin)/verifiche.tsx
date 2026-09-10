import { useRouter } from 'expo-router';
import { BadgeCheck, FileText, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, Screen, StepHeader, Text, TextField } from '@/components';
import { useAdminPendingCredentials, useReviewCredential } from '@/features/admin/hooks';
import type { AdminPendingCredentialRow } from '@/types/database';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min fa`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h fa`;
  return `${Math.round(h / 24)} g fa`;
}

function ReviewCard({ item }: { item: AdminPendingCredentialRow }) {
  const theme = useTheme();
  const review = useReviewCredential();
  const [note, setNote] = useState('');

  const act = (approve: boolean) => {
    if (!approve && !note.trim()) {
      Alert.alert('Motivo del rifiuto', 'Scrivi una nota per il tutor prima di rifiutare.');
      return;
    }
    review.mutate(
      { id: item.id, approve, note: note.trim() },
      {
        onError: (e) =>
          Alert.alert('Operazione non riuscita', e instanceof Error ? e.message : String(e)),
      },
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar uri={item.tutor_avatar_url} name={item.tutor_name} size={44} />
        <View style={styles.rowText}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {item.tutor_name || 'Tutor'}
          </Text>
          <View style={styles.metaRow}>
            {item.tutor_verified ? (
              <View style={[styles.tag, { backgroundColor: theme.successSoft }]}>
                <ShieldCheck size={11} color={theme.success} />
                <Text variant="caption" tone="success">
                  Verificato
                </Text>
              </View>
            ) : (
              <Text variant="caption" tone="soft">
                Non ancora verificato
              </Text>
            )}
            <Text variant="caption" tone="soft">
              · {timeAgo(item.requested_at)}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.detail, { borderColor: theme.border }]}>
        <Text variant="bodyStrong">{item.title}</Text>
        <Text variant="caption" tone="soft">
          {[item.institution, item.year].filter(Boolean).join(' · ') || 'Nessun dettaglio fornito'}
        </Text>
        <View style={styles.docRow}>
          <FileText size={13} color={item.document_url ? theme.primary : theme.textSoft} />
          <Text variant="caption" tone={item.document_url ? 'primary' : 'soft'}>
            {item.document_url ? 'Documento allegato' : 'Nessun documento allegato'}
          </Text>
        </View>
      </View>

      <TextField
        label="Nota per il tutor (obbligatoria se rifiuti)"
        placeholder="Es. il documento non è leggibile"
        value={note}
        onChangeText={setNote}
        multiline
      />

      <View style={styles.actions}>
        <Button
          label="Rifiuta"
          variant="danger"
          onPress={() => act(false)}
          loading={review.isPending && review.variables?.approve === false}
          style={styles.actionBtn}
        />
        <Button
          label="Approva"
          onPress={() => act(true)}
          loading={review.isPending && review.variables?.approve === true}
          style={styles.actionBtn}
        />
      </View>
    </Card>
  );
}

export default function AdminVerifiche() {
  const theme = useTheme();
  const router = useRouter();
  const { data: items = [], isLoading } = useAdminPendingCredentials();

  return (
    <Screen scroll>
      <StepHeader
        title="Verifiche titoli"
        subtitle="Approva o rifiuta le richieste di verifica dei tutor."
        onBack={() => router.back()}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck size={28} color={theme.primary} />}
          title="Nessuna richiesta"
          description="Quando un tutor chiede la verifica di un titolo di studio la trovi qui."
        />
      ) : (
        <View style={styles.list}>
          {items.map((it) => (
            <ReviewCard key={it.id} item={it} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.xxxl },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  detail: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
