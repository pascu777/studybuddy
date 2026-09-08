import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { APP_NAME } from '@/constants/app';
import { useTheme } from '@/theme/theme-provider';
import { fontFamily, palette, spacing } from '@/theme/tokens';
import { Text } from './Text';

type LogoProps = {
  size?: number;
  variant?: 'mark' | 'row' | 'stacked';
  color?: string;
  onDark?: boolean;
};

/** Marchio StudyBuddy: tocco accademico dentro un fumetto. Ridisegnato in SVG. */
export function LogoMark({ size = 44, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  const brand = color ?? theme.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* fumetto */}
      <Path
        d="M15 4H33C39.6 4 44 8.4 44 15V25C44 31.6 39.6 36 33 36H23L13.5 45L15.2 36C8.9 35 4 30.4 4 25V15C4 8.4 8.4 4 15 4Z"
        fill={brand}
      />
      {/* tesa del tocco */}
      <Path d="M24 12L37 18L24 24L11 18L24 12Z" fill={palette.white} />
      {/* fascia */}
      <Path
        d="M17 20.5V27C17 29.2 20.1 30.5 24 30.5C27.9 30.5 31 29.2 31 27V20.5"
        stroke={palette.white}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* nappa */}
      <Path d="M37 18V28" stroke={palette.white} strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx="37" cy="30" r="2.2" fill={palette.white} />
    </Svg>
  );
}

export function Logo({ size = 44, variant = 'row', color, onDark }: LogoProps) {
  const theme = useTheme();
  const wordColor = onDark ? palette.white : color ?? theme.text;

  if (variant === 'mark') {
    return <LogoMark size={size} color={color} />;
  }

  if (variant === 'stacked') {
    return (
      <View style={styles.stacked}>
        <LogoMark size={size} color={color} />
        <Text
          style={[styles.word, { fontSize: size * 0.52, color: wordColor }]}
        >
          {APP_NAME}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <LogoMark size={size} color={color} />
      <Text style={[styles.word, { fontSize: size * 0.5, color: wordColor }]}>{APP_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stacked: { alignItems: 'center', gap: spacing.sm },
  word: { fontFamily: fontFamily.display, letterSpacing: -0.5 },
});
