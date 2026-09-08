import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { TextVariant, typeScale } from '@/theme/tokens';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: string;
  tone?: 'default' | 'soft' | 'primary' | 'danger' | 'success' | 'inverse';
  center?: boolean;
  uppercase?: boolean;
};

export function Text({
  variant = 'body',
  color,
  tone = 'default',
  center,
  uppercase,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const toneColor: Record<NonNullable<TextProps['tone']>, string> = {
    default: theme.text,
    soft: theme.textSoft,
    primary: theme.primary,
    danger: theme.danger,
    success: theme.success,
    inverse: theme.primaryText,
  };

  const composed: TextStyle = {
    ...(typeScale[variant] as TextStyle),
    color: color ?? toneColor[tone],
    ...(center ? { textAlign: 'center' } : null),
    ...(uppercase ? { textTransform: 'uppercase' } : null),
  };

  return <RNText {...rest} style={[composed, style]} />;
}
