import {
  Atom,
  BookOpen,
  Briefcase,
  Landmark,
  Languages,
  Music,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { accents, AccentKey, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { Card } from './Card';
import { RatingBadge } from './RatingBadge';
import { Text } from './Text';

const AREA_ICON: Record<string, LucideIcon> = {
  STEM: Atom,
  Lingue: Languages,
  Umanistiche: BookOpen,
  'Economia e Diritto': Briefcase,
  'Arte e Musica': Music,
};

type Props = {
  name: string;
  area: string;
  accent: string;
  subtitle?: string;
  rating?: number | null;
  onPress?: () => void;
};

export function CategoryTile({ name, area, accent, subtitle, rating, onPress }: Props) {
  const theme = useTheme();
  const key = (accent in accents ? accent : 'mint') as AccentKey;
  const tone = accents[key];
  const Icon = AREA_ICON[area] ?? Landmark;

  return (
    <Card onPress={onPress} padding="md" style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
        <Icon size={22} color={tone.ink} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="soft" numberOfLines={1}>
          {subtitle ?? area}
        </Text>
      </View>
      {rating !== undefined ? <RatingBadge value={rating ?? null} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
});
