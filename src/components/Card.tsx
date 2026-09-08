import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, shadow, spacing } from '@/theme/tokens';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: keyof typeof spacing | number;
  elevated?: boolean;
  selected?: boolean;
};

export function Card({
  children,
  onPress,
  style,
  padding = 'lg',
  elevated = true,
  selected = false,
}: CardProps) {
  const theme = useTheme();
  const pad = typeof padding === 'number' ? padding : spacing[padding];

  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: selected ? theme.primary : theme.border,
    padding: pad,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          base,
          elevated && shadow.card,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, elevated && shadow.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
});
