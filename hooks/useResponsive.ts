import { useWindowDimensions } from 'react-native';

export const BREAKPOINT_DESKTOP = 900;
export const SIDEBAR_WIDTH_DESKTOP = 272;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT_DESKTOP;

  return {
    width,
    height,
    isDesktop,
    contentMaxWidth: isDesktop ? 1040 : undefined,
    sidebarWidth: isDesktop ? SIDEBAR_WIDTH_DESKTOP : 0,
    buttonMinHeight: isDesktop ? 48 : 50,
    buttonPaddingV: isDesktop ? 13 : 15,
    buttonFontSize: isDesktop ? 16 : 15,
    screenPadding: isDesktop ? 24 : 20,
  };
}
