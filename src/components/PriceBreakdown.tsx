import { StyleSheet, View } from 'react-native';

import { formatEUR } from '@/lib/money';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  priceCents: number;
  commissionCents: number;
  minutes: number;
  /** true = vista tutor (mostra il netto), false = vista studente (mostra il totale) */
  tutorView?: boolean;
};

export function PriceBreakdown({ priceCents, commissionCents, minutes, tutorView }: Props) {
  const theme = useTheme();
  const net = priceCents - commissionCents;

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Row label={`Lezione (${minutes} min)`} value={formatEUR(priceCents)} />
      {tutorView ? (
        <>
          <Row label="Commissione piattaforma" value={`− ${formatEUR(commissionCents)}`} soft />
          <View style={[styles.sep, { backgroundColor: theme.border }]} />
          <Row label="Il tuo netto" value={formatEUR(net)} strong />
        </>
      ) : (
        <>
          <View style={[styles.sep, { backgroundColor: theme.border }]} />
          <Row label="Totale da pagare" value={formatEUR(priceCents)} strong />
          <Text variant="caption" tone="soft" style={styles.note}>
            Include il servizio StudyBuddy. Il pagamento sarà gestito in-app.
          </Text>
        </>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  strong,
  soft,
}: {
  label: string;
  value: string;
  strong?: boolean;
  soft?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'bodyStrong' : 'body'} tone={soft ? 'soft' : 'default'}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} tone={soft ? 'soft' : 'default'}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  sep: { height: 1, marginVertical: 2 },
  note: { marginTop: 2 },
});
