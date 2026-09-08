import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Chip, Text } from '@/components';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import type { SchoolContext } from '@/types/database';
import { useSubjects } from './hooks';

type Props = {
  ctx: SchoolContext;
  selected: string[];
  onToggle: (id: string) => void;
};

export function SubjectPicker({ ctx, selected, onToggle }: Props) {
  const theme = useTheme();
  const { data: subjects = [], isLoading } = useSubjects(ctx);

  const groups = useMemo(() => {
    const map = new Map<string, typeof subjects>();
    for (const s of subjects) {
      const list = map.get(s.area) ?? [];
      list.push(s);
      map.set(s.area, list);
    }
    return Array.from(map.entries());
  }, [subjects]);

  if (isLoading) {
    return <ActivityIndicator color={theme.primary} style={styles.loader} />;
  }

  if (!subjects.length) {
    return (
      <Text variant="caption" tone="soft">
        Catalogo materie non disponibile. Verifica la connessione a Supabase.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {groups.map(([area, list]) => (
        <View key={area} style={styles.group}>
          <Text variant="label" tone="soft" style={styles.area}>
            {area}
          </Text>
          <View style={styles.chips}>
            {list.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                selected={selected.includes(s.id)}
                onPress={() => onToggle(s.id)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  group: { gap: spacing.sm },
  area: { textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  loader: { marginVertical: spacing.xl },
});
