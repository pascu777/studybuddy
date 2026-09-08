import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StepHeader, Text, ToggleRow } from '@/components';
import { spacing } from '@/theme/tokens';

export default function NotificheScreen() {
  const router = useRouter();
  const [granted, setGranted] = useState(false);
  const [canAsk, setCanAsk] = useState(true);
  const [checking, setChecking] = useState(true);

  const refresh = async () => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      setGranted(perm.status === 'granted');
      setCanAsk(perm.canAskAgain ?? perm.status !== 'denied');
    } catch {
      // Piattaforma senza supporto (es. alcune configurazioni web).
      setCanAsk(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  const onToggle = async (value: boolean) => {
    if (!value) {
      // Non si revoca da qui: si rimanda alle impostazioni di sistema.
      openSettings();
      return;
    }
    try {
      if (canAsk) {
        const req = await Notifications.requestPermissionsAsync();
        setGranted(req.status === 'granted');
        setCanAsk(req.canAskAgain ?? false);
        if (req.status !== 'granted') openSettings();
      } else {
        openSettings();
      }
    } catch {
      openSettings();
    }
  };

  return (
    <Screen scroll>
      <StepHeader
        title="Notifiche"
        subtitle="Servono per avvisarti di richieste, conferme e messaggi."
        onBack={() => router.back()}
      />

      <Card padding="sm">
        <ToggleRow
          label="Notifiche push"
          description={
            checking
              ? 'Verifica in corso…'
              : granted
                ? `Attive su questo dispositivo${Platform.OS === 'web' ? ' (limitate su web)' : ''}`
                : 'Disattivate — attivale per non perdere gli aggiornamenti'
          }
          value={granted}
          onValueChange={onToggle}
        />
      </Card>

      {!granted && !canAsk ? (
        <View style={styles.actions}>
          <Button label="Apri impostazioni" variant="secondary" onPress={openSettings} />
        </View>
      ) : null}

      <Text variant="caption" tone="soft" style={styles.note}>
        L'invio effettivo delle notifiche (promemoria lezioni, nuove richieste, messaggi) verrà
        attivato con le prossime funzionalità.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: spacing.md },
  note: { marginTop: spacing.lg },
});
