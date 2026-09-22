import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { MapPin, Navigation, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Card,
  Chip,
  EmptyState,
  NumberStepper,
  Screen,
  SegmentedControl,
  StepHeader,
  Text,
  TextField,
  TutorCard,
} from '@/components';
import { APP_NAME } from '@/constants/app';
import { useSubjects } from '@/features/catalog/hooks';
import { levelLabel } from '@/features/catalog/levels';
import { useProfile } from '@/features/profile/hooks';
import { useSearchTutors, useSearchTutorsByCourse, type SearchMode } from '@/features/search/hooks';
import { useSearchCourses } from '@/features/university/hooks';
import { getCurrentPlace, type Coords } from '@/lib/geo';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export default function CercaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const { data: full } = useProfile();
  const ctx = full?.profile.school_context ?? null;
  const isUni = ctx === 'university';
  const { data: subjects = [] } = useSubjects(ctx ?? undefined);

  const profileCoords: Coords | null =
    full?.profile.location_lat != null && full?.profile.location_lng != null
      ? { lat: full.profile.location_lat, lng: full.profile.location_lng }
      : null;

  const [byExam, setByExam] = useState(false);
  const [courseQuery, setCourseQuery] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(subject ?? null);
  const [mode, setMode] = useState<SearchMode>('any');
  const [level, setLevel] = useState(0);
  const [query, setQuery] = useState('');
  const [liveCoords, setLiveCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const coords = liveCoords ?? profileCoords;
  const needsLocation = mode !== 'online' && !coords;
  const examMode = isUni && byExam;

  const { data: courseResults = [] } = useSearchCourses(courseQuery, full?.studentProfile?.degree_course_id);

  const filters = useMemo(
    () => ({ subjectId, schoolContext: ctx, level: level || null, mode, query }),
    [subjectId, ctx, level, mode, query],
  );
  const bySubject = useSearchTutors(filters, coords);
  const byCourse = useSearchTutorsByCourse(examMode ? courseId : null, query);
  const active = examMode && courseId ? byCourse : bySubject;
  const results = active.data ?? [];
  const { isLoading, isError, refetch, isFetching } = active;

  const useMyLocation = async () => {
    try {
      setLocating(true);
      const place = await getCurrentPlace();
      setLiveCoords(place.coords);
    } catch {
      /* silenzioso: resta la modalità online */
    } finally {
      setLocating(false);
    }
  };

  const subjectName = subjects.find((s) => s.id === subjectId)?.name;

  return (
    <>
      <Head>
        <title>{`Trova un tutor — ${APP_NAME}`}</title>
      </Head>
      <Screen scroll>
      <StepHeader
        title="Trova un tutor"
        subtitle={
          coords
            ? 'Tutor vicino a te (raggio ~30 km) e lezioni online.'
            : 'Attiva la posizione per cercare tutor vicino a te, oppure filtra per lezioni online.'
        }
        onBack={() => router.back()}
      />

      {isUni ? (
        <View style={styles.uniToggle}>
          <SegmentedControl<'subject' | 'exam'>
            value={byExam ? 'exam' : 'subject'}
            onChange={(v) => setByExam(v === 'exam')}
            segments={[
              { value: 'subject', label: 'Per materia' },
              { value: 'exam', label: 'Per esame' },
            ]}
          />
        </View>
      ) : null}

      {examMode ? (
        <View style={styles.examBox}>
          <TextField
            placeholder="Cerca l'esame (es. Analisi Matematica 1)…"
            value={courseQuery}
            onChangeText={setCourseQuery}
          />
          <View style={styles.courseList}>
            {courseResults.slice(0, 8).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCourseId(c.id === courseId ? null : c.id)}
                style={[
                  styles.courseRow,
                  { borderColor: c.id === courseId ? theme.primary : theme.border },
                  c.id === courseId && { backgroundColor: theme.primarySoft },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{c.name}</Text>
                  <Text variant="caption" tone="soft">
                    {c.university_name} · {c.degree_course_name}
                    {c.professor_name ? ` · ${c.professor_name}` : ''}
                  </Text>
                </View>
                <Text variant="caption" tone="soft">
                  {c.tutors_count} tutor
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <TextField
          placeholder="Cerca per nome del tutor…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="words"
        />
      )}

      <Pressable
        onPress={() => setShowFilters((v) => !v)}
        style={[styles.filtersToggle, examMode && { display: 'none' }]}
      >
        <SlidersHorizontal size={15} color={theme.primary} />
        <Text variant="label" tone="primary">
          {showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
        </Text>
      </Pressable>

      {showFilters && !examMode ? (
        <Card style={styles.filters}>
          <View style={styles.block}>
            <Text variant="label" tone="soft">
              MATERIA
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip label="Tutte" selected={!subjectId} onPress={() => setSubjectId(null)} />
              {subjects.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={s.id === subjectId}
                  onPress={() => setSubjectId(s.id === subjectId ? null : s.id)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.block}>
            <Text variant="label" tone="soft">
              MODALITÀ
            </Text>
            <SegmentedControl<SearchMode>
              value={mode}
              onChange={setMode}
              segments={[
                { value: 'any', label: 'Tutte' },
                { value: 'in_person', label: 'In presenza' },
                { value: 'online', label: 'Online' },
              ]}
            />
          </View>

          {ctx ? (
            <View style={[styles.block, styles.levelBlock]}>
              <Text variant="label" tone="soft">
                LIVELLO
              </Text>
              <NumberStepper
                value={level}
                min={0}
                max={5}
                onChange={setLevel}
                format={(v) => (v === 0 ? 'Tutti i livelli' : levelLabel(ctx, v))}
              />
            </View>
          ) : null}

          <View style={styles.locRow}>
            <MapPin size={14} color={theme.textSoft} />
            <Text variant="caption" tone="soft" style={{ flex: 1 }}>
              {coords
                ? liveCoords
                  ? 'Posizione attuale'
                  : full?.profile.location_label || 'Posizione del profilo'
                : 'Posizione non impostata'}
            </Text>
            <Pressable onPress={useMyLocation} disabled={locating} style={styles.locBtn}>
              {locating ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Navigation size={13} color={theme.primary} />
              )}
              <Text variant="caption" tone="primary">
                Aggiorna
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      <View style={styles.resultsHead}>
        <Text variant="heading">
          {examMode
            ? courseId
              ? `Tutor per ${courseResults.find((c) => c.id === courseId)?.name ?? "l'esame"}`
              : 'Scegli un esame'
            : subjectName
              ? `Tutor di ${subjectName}`
              : 'Risultati'}
        </Text>
        {isFetching ? <ActivityIndicator size="small" color={theme.primary} /> : null}
      </View>

      {examMode && !courseId ? (
        <Text variant="caption" tone="soft">
          Seleziona l'esame qui sopra per vedere i tutor che lo coprono.
        </Text>
      ) : isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title="Ricerca non disponibile"
          description="Controlla la connessione a Supabase e riprova."
          action={
            <Pressable onPress={() => refetch()} style={styles.retry}>
              <Text variant="label" tone="primary">
                Riprova
              </Text>
            </Pressable>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<MapPin size={28} color={theme.primary} />}
          title="Nessun tutor trovato"
          description={
            needsLocation
              ? 'Attiva la posizione o passa alle lezioni online per vedere più risultati.'
              : 'Prova ad allargare i filtri o a cambiare materia.'
          }
        />
      ) : (
        <View style={styles.list}>
          {results.map((t) => (
            <TutorCard
              key={t.id}
              tutor={t}
              onPress={() => router.push({ pathname: '/(app)/tutor/[id]', params: { id: t.id } })}
            />
          ))}
        </View>
      )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  uniToggle: { marginBottom: spacing.md },
  examBox: { gap: spacing.sm },
  courseList: { gap: spacing.xs },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: spacing.md,
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  filters: { gap: spacing.lg },
  block: { gap: spacing.sm },
  levelBlock: { alignItems: 'flex-start' },
  chipRow: { gap: spacing.xs, paddingVertical: 2 },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  loader: { marginVertical: spacing.xxl },
  retry: {
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
});
