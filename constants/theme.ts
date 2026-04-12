/** Paleta marrom — massas artesanais */
export const theme = {
  colors: {
    background: '#F7F3EF',
    surface: '#FFFFFF',
    surfaceMuted: '#EDE6DF',
    text: '#2C2419',
    textSecondary: '#6B5D4D',
    textMuted: '#9A8B7A',
    border: '#D4C4B5',
    primary: '#6B4423',
    primaryDark: '#4A2F18',
    primaryLight: '#8B5A32',
    accent: '#A67C52',
    success: '#5C7A4A',
    warning: '#B8860B',
    danger: '#A94442',
    tabBar: '#FAF7F4',
    overlay: 'rgba(44, 36, 25, 0.45)',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  font: {
    title: 22,
    subtitle: 17,
    body: 15,
    caption: 13,
    small: 12,
  },
} as const;

export type Theme = typeof theme;
