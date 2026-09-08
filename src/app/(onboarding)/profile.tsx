import { useRouter } from 'expo-router';
import { MapPin, Navigation } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, PhotoPicker, Screen, StepHeader, Text, TextField } from '@/components';
import { stepCount } from '@/features/onboarding/steps';
import { uploadAvatar, useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { geocodeText, getCurrentPlace, type Coords } from '@/lib/geo';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { validateRequired } from '@/lib/validation';

export default function ProfileStep() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useSession();
  const { data: full } = useProfile();
  const update = useUpdateProfile();

  const role = full?.profile.role ?? null;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoIsRemote, setPhotoIsRemote] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!full) return;
    setFirstName((v) => v || full.profile.first_name);
    setLastName((v) => v || full.profile.last_name);
    setLocationLabel((v) => v || full.profile.location_label || '');
    if (full.profile.location_lat != null && full.profile.location_lng != null) {
      setCoords({ lat: full.profile.location_lat, lng: full.profile.location_lng });
    }
    if (full.profile.avatar_url && !photo) {
      setPhoto(full.profile.avatar_url);
      setPhotoIsRemote(true);
    }
  }, [full]);

  const useMyLocation = async () => {
    try {
      setLocating(true);
      const place = await getCurrentPlace();
      setLocationLabel(place.label);
      setCoords(place.coords);
    } catch (e) {
      const denied = e instanceof Error && e.message === 'permission-denied';
      Alert.alert(
        denied ? 'Permesso posizione negato' : 'Posizione non disponibile',
        denied
          ? 'Puoi inserire la tua città manualmente qui sotto.'
          : 'Riprova o inserisci la tua città manualmente.',
      );
    } finally {
      setLocating(false);
    }
  };

  const onLocationBlur = async () => {
    if (!locationLabel.trim() || coords) return;
    const place = await geocodeText(locationLabel);
    if (place) {
      setLocationLabel(place.label);
      setCoords(place.coords);
    }
  };

  const submit = async () => {
    const next = {
      firstName: validateRequired(firstName, 'Nome'),
      lastName: validateRequired(lastName, 'Cognome'),
      location: validateRequired(locationLabel, 'Posizione'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    try {
      let avatarUrl = full?.profile.avatar_url ?? null;
      if (photo && !photoIsRemote && userId) {
        avatarUrl = await uploadAvatar(userId, photo);
      } else if (photo === null) {
        avatarUrl = null;
      }

      await update.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_url: avatarUrl,
        location_label: locationLabel.trim(),
        coords,
      });

      router.push(role === 'tutor' ? '/(onboarding)/tutor/credentials' : '/(onboarding)/student/studies');
    } catch {
      Alert.alert('Ops', 'Non è stato possibile salvare il profilo. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scroll
      footer={<Button label="Continua" onPress={submit} loading={saving} />}
    >
      <StepHeader
        title="Il tuo profilo"
        subtitle="Questi dati aiutano tutor e studenti a riconoscerti."
        step={1}
        total={stepCount(role)}
        onBack={() => router.back()}
      />

      <View style={styles.photo}>
        <PhotoPicker
          value={photo}
          name={`${firstName} ${lastName}`.trim()}
          onChange={(uri) => {
            setPhoto(uri);
            setPhotoIsRemote(false);
          }}
        />
      </View>

      <View style={styles.form}>
        <TextField
          label="Nome"
          placeholder="Marco"
          autoCapitalize="words"
          value={firstName}
          onChangeText={setFirstName}
          error={errors.firstName}
        />
        <TextField
          label="Cognome"
          placeholder="Rossi"
          autoCapitalize="words"
          value={lastName}
          onChangeText={setLastName}
          error={errors.lastName}
        />

        <View>
          <TextField
            label="Posizione"
            placeholder="Es. Torino, TO"
            value={locationLabel}
            onChangeText={(v) => {
              setLocationLabel(v);
              setCoords(null);
            }}
            onBlur={onLocationBlur}
            error={errors.location}
            iconLeft={<MapPin size={18} color={theme.textSoft} />}
            hint="Serve per trovare tutor vicino a te (raggio ~20–30 km) — le lezioni online non hanno vincoli di distanza."
          />
          <Pressable
            onPress={useMyLocation}
            disabled={locating}
            style={[styles.locBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Navigation size={16} color={theme.primary} />
            )}
            <Text variant="label" tone="primary">
              Usa la mia posizione
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: 'center', marginVertical: spacing.lg },
  form: { gap: spacing.md },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.pill,
  },
});
