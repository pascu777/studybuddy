import { forwardRef, ReactNode, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  iconLeft?: ReactNode;
  slotRight?: ReactNode;
  containerStyle?: ViewStyle;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, iconLeft, slotRight, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="label" tone="soft" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          { backgroundColor: theme.surface, borderColor },
        ]}
      >
        {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textSoft}
          selectionColor={theme.primary}
          style={[styles.input, { color: theme.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {slotRight ? <View style={styles.slotRight}>{slotRight}</View> : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="soft" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginLeft: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  iconLeft: { marginRight: spacing.sm },
  slotRight: { marginLeft: spacing.sm },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  helper: { marginLeft: spacing.xs },
});
