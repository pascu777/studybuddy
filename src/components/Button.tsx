import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  iconLeft,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const pressed = useSharedValue(0);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
    opacity: 1 - pressed.value * 0.05,
  }));

  const bg: Record<Variant, string> = {
    primary: theme.primary,
    secondary: theme.surface,
    ghost: 'transparent',
    danger: theme.dangerSoft,
  };
  const fg: Record<Variant, string> = {
    primary: theme.primaryText,
    secondary: theme.text,
    ghost: theme.primary,
    danger: theme.danger,
  };
  const borderColor: Record<Variant, string> = {
    primary: theme.primary,
    secondary: theme.border,
    ghost: 'transparent',
    danger: 'transparent',
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => (pressed.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: 140 }))}
      style={[
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        {
          backgroundColor: bg[variant],
          borderColor: borderColor[variant],
        },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={styles.content}>
          {iconLeft ? <View style={styles.icon}>{iconLeft}</View> : null}
          <Text variant="button" color={fg[variant]} uppercase>
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  lg: { paddingVertical: 17, paddingHorizontal: spacing.xl },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { marginRight: 2 },
});
