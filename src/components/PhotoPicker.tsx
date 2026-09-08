import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Text } from './Text';

type Props = {
  value?: string | null;
  name?: string;
  onChange: (localUri: string | null) => void;
  size?: number;
};

export function PhotoPicker({ value, name, onChange, size = 104 }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    try {
      setBusy(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permesso necessario', 'Consenti l’accesso alle foto per scegliere un’immagine.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]) return;

      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      onChange(manipulated.uri);
    } catch {
      Alert.alert('Ops', 'Non è stato possibile caricare la foto. Riprova.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={pick} disabled={busy} accessibilityRole="button" accessibilityLabel="Scegli foto profilo">
        <Avatar uri={value} name={name} size={size} />
        <View style={[styles.fab, { backgroundColor: theme.primary, borderColor: theme.bg }]}>
          {value ? (
            <Pencil size={16} color={theme.primaryText} />
          ) : (
            <Camera size={16} color={theme.primaryText} />
          )}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Text variant="caption" tone="soft" center>
          Facoltativa, ma consigliata — aiuta a creare fiducia.
        </Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text variant="caption" tone="primary" center>
              Rimuovi foto
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  fab: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: 2 },
});
