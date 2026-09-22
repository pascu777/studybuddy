import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import {
  BadgeCheck,
  BookOpen,
  CalendarClock,
  GraduationCap,
  Laptop,
  MapPin,
  MessageCircle,
  Users,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Chip, EmptyState, Screen, StepHeader, Text } from '@/components';
import { APP_NAME } from '@/constants/app';
import { useOpenConversation } from '@/features/chat/hooks';
import { useTutor } from '@/features/search/hooks';
import { formatEUR } from '@/lib/money';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

export default function TutorProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tutor, isLoading, isError } = useTutor(id);
  const openConversation = useOpenConversation();

  const writeMessage = async () => {
    if (!tutor) return;
    try {
      const conv = await openConversation.mutateAsync({ tutorId: tutor.id });
      router.push({
        pathname: '/(app)/chat/[id]',
        params: { id: conv.id, name: `${tutor.first_name} ${tutor.last_name}` },
      });
    } catch {
      /* noop */
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xxxl }} />
      </Screen>
    );
  }

  if (isError || !tutor) {
    return (
      <Screen>
        <StepHeader title="Tutor" onBack={() => router.back()} />
        <EmptyState title="Profilo non disponibile" description="Il tutor non esiste più o non è raggiungibile." />
      </Screen>
    );
  }

  const name = `${tutor.first_name} ${tutor.last_name}`.trim();
  const keep = (x: unknown): x is string => typeof x === 'string';
  const ambiti = [
    tutor.teaches_high_school && 'Superiori',
    tutor.teaches_university && 'Università',
  ].filter(keep);
  const modalita = [
    tutor.delivery_in_person && 'In presenza',
    tutor.delivery_online && 'Online',
  ].filter(keep);

  return (
    <>
      <Head>
        <title>{`${name} — ${APP_NAME}`}</title>
      </Head>
      <Screen
      scroll
      footer={
        tutor.accepting_students ? (
          <Button
            label="Prenota lezione"
            onPress={() => router.push({ pathname: '/(app)/prenota', params: { tutorId: tutor.id } })}
          />
        ) : (
          <Button label="Non accetta nuovi studenti" variant="secondary" disabled />
        )
      }
    >
      <StepHeader title="Tutor" onBack={() => router.back()} />

      <Card style={styles.header}>
        <Avatar uri={tutor.avatar_url} name={name} size={64} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text variant="heading">{name}</Text>
            {tutor.verified ? <BadgeCheck size={18} color={theme.success} /> : null}
          </View>
          {tutor.university_name || tutor.degree_course ? (
            <Text variant="caption" tone="soft">
              {[tutor.degree_course, tutor.university_name].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {tutor.location_label ? (
            <View style={styles.meta}>
              <MapPin size={12} color={theme.textSoft} />
              <Text variant="caption" tone="soft">
                {tutor.location_label}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Pressable onPress={writeMessage} style={[styles.writeBtn, { borderColor: theme.border }]}>
        <MessageCircle size={15} color={theme.primary} />
        <Text variant="label" tone="primary">
          Scrivi a {tutor.first_name}
        </Text>
      </Pressable>

      <View style={styles.pills}>
        {tutor.hourly_rate_cents ? (
          <View style={[styles.pill, { backgroundColor: theme.primarySoft }]}>
            <Text variant="caption" color={theme.onPrimarySoft}>
              {formatEUR(tutor.hourly_rate_cents)}/ora
            </Text>
          </View>
        ) : null}
        {tutor.free_slots != null ? (
          <View style={[styles.pill, { backgroundColor: theme.successSoft }]}>
            <CalendarClock size={13} color={theme.success} />
            <Text variant="caption" color={theme.success}>
              {tutor.free_slots} slot liberi
            </Text>
          </View>
        ) : null}
        {modalita.map((m) => (
          <View key={m} style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
            {m === 'Online' ? (
              <Laptop size={13} color={theme.textSoft} />
            ) : (
              <Users size={13} color={theme.textSoft} />
            )}
            <Text variant="caption" tone="soft">
              {m}
            </Text>
          </View>
        ))}
      </View>

      {tutor.bio ? (
        <View style={styles.section}>
          <Text variant="heading" style={styles.h}>
            Su di me
          </Text>
          <Text variant="body" tone="soft">
            {tutor.bio}
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="heading" style={styles.h}>
          Insegna
        </Text>
        <Text variant="caption" tone="soft" style={{ marginBottom: spacing.sm }}>
          {ambiti.join(' e ') || 'Ripetizioni'}
        </Text>
        <View style={styles.chips}>
          {(tutor.subjects ?? []).map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      </View>

      {tutor.courses && tutor.courses.length ? (
        <View style={styles.section}>
          <Text variant="heading" style={styles.h}>
            Esami universitari coperti
          </Text>
          <View style={styles.creds}>
            {tutor.courses.map((c) => (
              <View key={c} style={styles.credRow}>
                <BookOpen size={15} color={theme.primary} />
                <Text variant="caption" tone="soft" style={{ flex: 1 }}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {tutor.credentials && tutor.credentials.length ? (
        <View style={styles.section}>
          <Text variant="heading" style={styles.h}>
            Titoli verificati
          </Text>
          <View style={styles.creds}>
            {tutor.credentials.map((c) => (
              <View key={c} style={styles.credRow}>
                <GraduationCap size={15} color={theme.success} />
                <Text variant="caption" tone="soft" style={{ flex: 1 }}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  headerText: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: 999,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
  },
  section: { marginTop: spacing.xl },
  h: { marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  creds: { gap: spacing.sm },
  credRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
