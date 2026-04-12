import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { theme } from '@/constants/theme';
import { MENU_SECTIONS } from '@/lib/navigationCatalog';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function MaisScreen() {
  const router = useRouter();

  return (
    <AppScreen>
      <PageHeader
        title="Menu"
        subtitle="A busca fica logo no inicio e o restante segue organizado por operacao e cadastro."
      />

      {MENU_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionDescription}>{section.description}</Text>

          <View style={styles.list}>
            {section.items.map((item) => (
              <Pressable
                key={`${section.title}-${item.title}`}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}>
                <View style={styles.iconWrap}>
                  <FontAwesome
                    name={item.icon}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>

                <FontAwesome
                  name="chevron-right"
                  size={14}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.space.lg,
  },
  sectionTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  sectionDescription: {
    marginTop: 4,
    marginBottom: theme.space.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.font.caption,
    lineHeight: 18,
  },
  list: {
    gap: theme.space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.space.md,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
});
