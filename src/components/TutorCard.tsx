import { MapPin, ShieldCheck, Wifi } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import type { TutorCardRow } from '@/types/database';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { Chip } from './Chip';
import { Text } from './Text';

type Props = {
  tutor: TutorCardRow;
  onPress?: () => void;
};

export function TutorCard({ tutor, onPress }: Props) {
  const theme = useTheme();
  const name = `${tutor.first_name} ${tutor.last_name}`.trim();
  const subjects = tutor.subjects?.filter(Boolean) ?? [];

  const where =
    tutor.distance_km != null
      ? `${tutor.distance_km} km`
      : tutor.location_label || (tutor.delivery_online ? 'Solo online' : '');

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.head}>
        <Avatar uri={tutor.avatar_url} name={name} size={48} />
        <View style={styles.headText}>
          <View style={styles.nameRow}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            {tutor.verified ? <ShieldCheck size={15} color={theme.success} /> : null}
          </View>
          <View style={styles.metaRow}>
            {where ? (
              <View style={styles.meta}>
                <MapPin size={12} color={theme.textSoft} />
                <Text variant="caption" tone="soft">
                  {where}
                </Text>
              </View>
            ) : null}
            {tutor.delivery_online ? (
              <View style={styles.meta}>
                <Wifi size={12} color={theme.textSoft} />
                <Text variant="caption" tone="soft">
                  Online
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {tutor.bio ? (
        <Text variant="caption" tone="soft" numberOfLines={2} style={styles.bio}>
          {tutor.bio}
        </Text>
      ) : null}

      {subjects.length ? (
        <View style={styles.chips}>
          {subjects.slice(0, 4).map((s) => (
            <Chip key={s} label={s} />
          ))}
          {subjects.length > 4 ? <Chip label={`+${subjects.length - 4}`} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  headText: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bio: { marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
});
