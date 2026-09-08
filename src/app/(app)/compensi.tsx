import { useRouter } from 'expo-router';
import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, NumberStepper, Screen, StatTile, StepHeader, Text, TextField } from '@/components';
import { useEarningsSummary, useSetTutorRate, useTutorRate } from '@/features/payments/hooks';
import { useProfile, useUpsertTutorProfile } from '@/features/profile/hooks';
import { formatEUR } from '@/lib/money';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export default function CompensiScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: full } = useProfile();
  const { data: summary, isLoading } = useEarningsSummary();
  const { data: rateCents } = useTutorRate();
  const setRate = useSetTutorRate();
  const upsertTutor = useUpsertTutorProfile();

  const [rateEuro, setRateEuro] = useState(15);
  const [vat, setVat] = useState('');

  useEffect(() => {
    if (rateCents != null) setRateEuro(Math.round(rateCents / 100));
  }, [rateCents]);
  useEffect(() => {
    if (full?.tutorProfile?.partita_iva) setVat(full.tutorProfile.partita_iva);
  }, [full?.tutorProfile?.partita_iva]);

  const pct = summary ? Math.min(100, Math.round((summary.ytd_gross_cents / summary.limit_cents) * 100)) : 0;
  const nearLimit = summary && !summary.has_vat && pct >= 80;

  return (
    <Screen scroll>
      <StepHeader title="Compensi" subtitle="Guadagni dell'anno e impostazioni fiscali." onBack={() => router.back()} />

      {isLoading || !summary ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.stats}>
            <StatTile value={formatEUR(summary.ytd_net_cents)} label="Netto quest'anno" icon={<Wallet size={16} color={theme.textSoft} />} />
            <StatTile value={formatEUR(summary.ytd_gross_cents)} label="Lordo quest'anno" icon={<TrendingUp size={16} color={theme.textSoft} />} />
            <StatTile value={summary.lessons_count} label="Lezioni pagate" />
          </View>

          <Card style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text variant="bodyStrong">Soglia prestazione occasionale</Text>
              <Text variant="caption" tone="soft">
                {formatEUR(summary.ytd_gross_cents)} / {formatEUR(summary.limit_cents)}
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${pct}%`,
                    backgroundColor: summary.has_vat
                      ? theme.success
                      : pct >= 100
                        ? theme.danger
                        : pct >= 80
                          ? '#F59E0B'
                          : theme.primary,
                  },
                ]}
              />
            </View>
            {summary.has_vat ? (
              <Text variant="caption" tone="success">
                Partita IVA attiva: nessun limite per operare.
              </Text>
            ) : summary.over_threshold ? (
              <View style={styles.warn}>
                <AlertTriangle size={14} color={theme.danger} />
                <Text variant="caption" tone="danger" style={{ flex: 1 }}>
                  Hai superato la soglia annua. Inserisci la Partita IVA qui sotto per poter
                  confermare nuove lezioni a pagamento.
                </Text>
              </View>
            ) : nearLimit ? (
              <Text variant="caption" tone="soft">
                Ti stai avvicinando alla soglia: valuta l'apertura della Partita IVA.
              </Text>
            ) : (
              <Text variant="caption" tone="soft">
                Sotto la soglia puoi operare come prestazione occasionale.
              </Text>
            )}
          </Card>

          <Card style={styles.block}>
            <Text variant="label" tone="soft">
              TARIFFA ORARIA
            </Text>
            <NumberStepper
              value={rateEuro}
              min={5}
              max={90}
              onChange={setRateEuro}
              format={(v) => `${v} €/ora`}
            />
            <Text variant="caption" tone="soft">
              Lo studente vede il prezzo della lezione calcolato su questa tariffa. La commissione
              StudyBuddy ({summary ? Math.round(summary.commission_rate * 100) : 10}%) è già inclusa
              nel totale che paga lo studente.
            </Text>
            <Button
              label="Salva tariffa"
              variant="secondary"
              onPress={() => setRate.mutate(rateEuro * 100)}
              loading={setRate.isPending}
            />
          </Card>

          <Card style={styles.block}>
            <TextField
              label="Partita IVA"
              placeholder="IT01234567890"
              autoCapitalize="characters"
              value={vat}
              onChangeText={setVat}
            />
            <Button
              label="Salva Partita IVA"
              variant="secondary"
              onPress={() =>
                upsertTutor.mutate({
                  partita_iva: vat.trim() || null,
                  fiscal_regime: vat.trim() ? 'vat' : 'occasional',
                })
              }
              loading={upsertTutor.isPending}
            />
          </Card>

          <Text variant="caption" tone="soft" style={styles.foot}>
            L'incasso e i bonifici verranno gestiti in-app tramite un fornitore di pagamenti
            (integrazione in arrivo).
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: spacing.xxxl },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  progressCard: { gap: spacing.sm, marginBottom: spacing.md },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 999 },
  warn: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  block: { gap: spacing.sm, marginBottom: spacing.md },
  foot: { marginTop: spacing.sm },
});
