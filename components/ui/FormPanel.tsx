import { theme } from '@/constants/theme';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FormPanel({ title, subtitle, children, style }: Props) {
  return (
    <View style={[styles.panel, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
  },
  title: {
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  subtitle: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  content: {
    marginTop: theme.space.md,
  },
});
