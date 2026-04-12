import { theme } from '@/constants/theme';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
    marginTop: theme.space.sm,
  },
  title: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
});
