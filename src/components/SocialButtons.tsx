import { Apple } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  /** In Fase 1 sempre disabilitati: mostrati per coerenza col mockup. */
  enabled?: boolean;
  context?: 'signin' | 'signup';
};

/**
 * Pulsanti di accesso social. Nella Fase 1 sono resi ma disattivati con nota
 * "Presto disponibile" — l'accesso funzionante è solo email + password.
 */
export function SocialButtons({ enabled = false, context = 'signin' }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Text variant="caption" tone="soft">
          oppure {context === 'signup' ? 'registrati' : 'accedi'} con
        </Text>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>

      <View style={[styles.row, !enabled && styles.disabled]}>
        <View style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.googleG, { color: theme.textSoft }]}>G</Text>
        </View>
        <View style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Apple size={22} color={theme.textSoft} fill={theme.textSoft} />
        </View>
        <View style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.googleG, { color: theme.textSoft }]}>Ig</Text>
        </View>
      </View>

      {!enabled ? (
        <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
          <Text variant="caption" tone="soft">
            Presto disponibile
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, alignItems: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  line: { flex: 1, height: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  disabled: { opacity: 0.45 },
  btn: {
    width: 60,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { fontSize: 20, fontWeight: '700' },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
});
