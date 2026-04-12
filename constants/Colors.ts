import { theme } from './theme';

/** Compatível com tabs legados + tema Rita Massas */
export default {
  light: {
    text: theme.colors.text,
    background: theme.colors.background,
    tint: theme.colors.primary,
    tabIconDefault: theme.colors.textMuted,
    tabIconSelected: theme.colors.primary,
  },
  dark: {
    text: '#F5F0EB',
    background: '#1A1510',
    tint: theme.colors.accent,
    tabIconDefault: '#8A7B6A',
    tabIconSelected: theme.colors.accent,
  },
};
