import { BrandMark } from '@/components/branding/BrandMark';
import { useColorScheme } from '@/components/useColorScheme';
import { theme } from '@/constants/theme';
import {
  BREAKPOINT_DESKTOP,
  SIDEBAR_WIDTH_DESKTOP,
} from '@/hooks/useResponsive';
import { SIDEBAR_SECTIONS } from '@/lib/navigationCatalog';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useSegments } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function activeTabKey(segments: readonly string[]): string {
  if (segments[0] === '(tabs)') {
    return segments[1] ?? 'index';
  }

  if (segments.length === 0) {
    return 'index';
  }

  const [root, second] = segments;

  if (root === 'pedido') {
    return second === 'novo' ? 'novo-pedido' : 'pedidos';
  }

  if (root === 'clientes') {
    return 'clientes';
  }

  if (root === 'produtos') {
    return 'produtos';
  }

  if (root === 'busca') {
    return 'busca';
  }

  if (root === 'relatorios') {
    return 'relatorios';
  }

  return root ?? 'index';
}

export function SidebarNav() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (width < BREAKPOINT_DESKTOP) {
    return null;
  }

  const current = activeTabKey(segments);

  return (
    <View
      style={[
        styles.sidebar,
        isDark && styles.sidebarDark,
        {
          paddingTop: Math.max(insets.top, 18),
          paddingBottom: Math.max(insets.bottom, 18),
        },
      ]}>
      <View style={[styles.brand, isDark && styles.brandDark]}>
        <View style={styles.brandHeader}>
          <BrandMark size={34} />
          <Text style={[styles.brandTitle, isDark && styles.brandTitleDark]}>
            Rita Massas
          </Text>
        </View>
        <Text style={[styles.brandSub, isDark && styles.brandSubDark]}>
          Operacao, cadastro e agenda em um so lugar
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {SIDEBAR_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>
              {section.title}
            </Text>

            <View style={styles.nav}>
              {section.items.map((item) => {
                const active = current === item.key;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => router.push(item.href)}
                    style={({ pressed }) => [
                      styles.row,
                      active && styles.rowActive,
                      active && isDark && styles.rowActiveDark,
                      pressed && styles.rowPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={item.title}>
                    <View style={styles.iconWrap}>
                      <FontAwesome
                        name={item.icon}
                        size={20}
                        color={
                          active
                            ? theme.colors.primary
                            : isDark
                              ? '#A89888'
                              : theme.colors.textMuted
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.label,
                        isDark && styles.labelDark,
                        active && styles.labelActive,
                        active && isDark && styles.labelActiveDark,
                      ]}>
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH_DESKTOP,
    flexShrink: 0,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  sidebarDark: {
    backgroundColor: '#252018',
    borderRightColor: '#3D3428',
  },
  brand: {
    paddingHorizontal: 12,
    paddingBottom: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  brandDark: {
    borderBottomColor: '#3D3428',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: -0.3,
  },
  brandTitleDark: {
    color: '#F5F0EB',
  },
  brandSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  brandSubDark: {
    color: '#8A7B6A',
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 8,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: theme.colors.textMuted,
  },
  sectionLabelDark: {
    color: '#8A7B6A',
  },
  nav: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    minHeight: 50,
  },
  rowActive: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  rowActiveDark: {
    backgroundColor: '#3D3428',
  },
  rowPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  labelDark: {
    color: '#C4B5A5',
  },
  labelActive: {
    color: theme.colors.primaryDark,
  },
  labelActiveDark: {
    color: theme.colors.accent,
  },
});
