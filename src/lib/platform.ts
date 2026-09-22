import { Platform, useWindowDimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';

/** Sopra questa larghezza il sito passa dalla tab bar mobile a una sidebar desktop. */
export const DESKTOP_BREAKPOINT = 900;

export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return isWeb && width >= DESKTOP_BREAKPOINT;
}
