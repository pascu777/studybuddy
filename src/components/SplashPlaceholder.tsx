import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { Logo } from './Logo';

/** Schermata neutra mostrata mentre si risolve sessione / profilo. */
export function SplashPlaceholder() {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <Logo variant="stacked" size={56} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
