import { useRouter, useSegments, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Logo } from './Logo';
import { Text } from './Text';

export type SidebarItem = {
  name: string;
  href: Href;
  title: string;
  icon: LucideIcon;
  showBadge?: boolean;
};

type SidebarProps = {
  items: SidebarItem[];
};

/** Sostituisce la tab bar in basso sopra la soglia desktop (vedi useIsDesktopWeb). */
export function Sidebar({ items }: SidebarProps) {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const active = segments[segments.length - 1];

  return (
    <View style={[styles.root, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
      <View style={styles.logo}>
        <Logo variant="row" size={32} />
      </View>

      <View style={styles.items}>
        {items.map((item) => {
          const isActive = item.name === active;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.name}
              onPress={() => router.push(item.href)}
              style={[styles.item, isActive && { backgroundColor: theme.primarySoft }]}
            >
              <View style={styles.iconWrap}>
                <Icon size={19} color={isActive ? theme.primary : theme.textSoft} />
                {item.showBadge ? (
                  <View style={[styles.dot, { backgroundColor: theme.primary, borderColor: theme.surface }]} />
                ) : null}
              </View>
              <Text variant="bodyStrong" color={isActive ? theme.onPrimarySoft : theme.textSoft}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 232,
    borderRightWidth: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  logo: { paddingHorizontal: spacing.sm },
  items: { gap: spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  iconWrap: { width: 19, height: 19, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
