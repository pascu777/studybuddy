/**
 * Token di design di StudyBuddy — derivati dal mockup di riferimento.
 */

export const palette = {
  // Brand — viola
  violet50: '#F1EDFF',
  violet100: '#E3DBFF',
  violet200: '#C7B8FF',
  violet400: '#8B6BFF',
  violet500: '#6B4EFF', // primario
  violet600: '#5A3EE6',
  violet700: '#4530B4',

  // Verde — rating / successo
  green100: '#DCFCE7',
  green500: '#22C55E',
  green600: '#16A34A',

  // Pastelli per le tile delle materie
  mint: '#DFF5EC',
  mintInk: '#0F7A5A',
  peach: '#FFE9DC',
  peachInk: '#C2410C',
  sky: '#E2ECFF',
  skyInk: '#1D4ED8',
  sage: '#E9F3D8',
  sageInk: '#4D7C0F',
  lavender: '#EEE7FF',
  lavenderInk: '#6D28D9',

  // Neutri chiari
  white: '#FFFFFF',
  ink: '#171626',
  inkSoft: '#5B5870',
  cloud: '#FAFAFB',
  line: '#ECECF1',

  // Neutri scuri
  night: '#111019',
  nightCard: '#1B1A26',
  nightLine: '#2C2A3A',
  nightInk: '#F3F1FA',
  nightInkSoft: '#A8A4BC',

  danger: '#E11D48',
  dangerBg: '#FFE4E6',
  amber: '#F59E0B',
} as const;

export type AccentKey = 'mint' | 'peach' | 'sky' | 'sage' | 'lavender';

export const accents: Record<AccentKey, { bg: string; ink: string }> = {
  mint: { bg: palette.mint, ink: palette.mintInk },
  peach: { bg: palette.peach, ink: palette.peachInk },
  sky: { bg: palette.sky, ink: palette.skyInk },
  sage: { bg: palette.sage, ink: palette.sageInk },
  lavender: { bg: palette.lavender, ink: palette.lavenderInk },
};

export type AppTheme = {
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSoft: string;
  border: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  onPrimarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
};

export const lightTheme: AppTheme = {
  mode: 'light',
  bg: palette.cloud,
  surface: palette.white,
  surfaceAlt: '#F4F3F7',
  text: palette.ink,
  textSoft: palette.inkSoft,
  border: palette.line,
  primary: palette.violet500,
  primaryText: palette.white,
  primarySoft: palette.violet50,
  onPrimarySoft: palette.violet700,
  success: palette.green500,
  successSoft: palette.green100,
  danger: palette.danger,
  dangerSoft: palette.dangerBg,
  overlay: 'rgba(23, 22, 38, 0.45)',
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  bg: palette.night,
  surface: palette.nightCard,
  surfaceAlt: '#232231',
  text: palette.nightInk,
  textSoft: palette.nightInkSoft,
  border: palette.nightLine,
  primary: palette.violet400,
  primaryText: '#12101F',
  primarySoft: 'rgba(139, 107, 255, 0.14)',
  onPrimarySoft: palette.violet200,
  success: palette.green500,
  successSoft: 'rgba(34, 197, 94, 0.16)',
  danger: '#FB7185',
  dangerSoft: 'rgba(244, 63, 94, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fontFamily = {
  display: 'BricolageGrotesque_700Bold',
  displaySemibold: 'BricolageGrotesque_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'button';

export const typeScale: Record<TextVariant, object> = {
  display: { fontFamily: fontFamily.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.3 },
  heading: { fontFamily: fontFamily.displaySemibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.bodySemibold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: 13, lineHeight: 16 },
  caption: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fontFamily.bodyBold, fontSize: 14, lineHeight: 16, letterSpacing: 0.8 },
};

export const shadow = {
  card: {
    shadowColor: '#1B1730',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  lifted: {
    shadowColor: '#1B1730',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
} as const;
