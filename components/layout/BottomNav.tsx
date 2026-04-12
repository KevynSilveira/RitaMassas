import { useColorScheme } from '@/components/useColorScheme';
import { theme } from '@/constants/theme';
import { BREAKPOINT_DESKTOP } from '@/hooks/useResponsive';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Href, useRouter, useSegments } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Item = {
  key: string;
  title: string;
  href: Href;
  icon: ComponentProps<typeof FontAwesome>['name'];
};

const ITEMS: Item[] = [
  { key: 'index', title: 'Inicio', href: '/', icon: 'home' },
  { key: 'pedidos', title: 'Pedidos', href: '/pedidos', icon: 'list-alt' },
  { key: 'agenda', title: 'Agenda', href: '/agenda', icon: 'calendar' },
  { key: 'relatorios', title: 'Relatorios', href: '/relatorios', icon: 'bar-chart' },
  { key: 'mais', title: 'Menu', href: '/mais', icon: 'bars' },
];

function activeTabKey(segments: readonly string[]): string {
  if (segments[0] === '(tabs)') {
    return segments[1] ?? 'index';
  }

  if (segments.length === 0) {
    return 'index';
  }

  const [root] = segments;

  if (root === 'pedido') {
    return 'pedidos';
  }

  if (root === 'clientes' || root === 'produtos' || root === 'busca') {
    return 'mais';
  }

  if (root === 'relatorios') {
    return 'relatorios';
  }

  return root ?? 'index';
}

export function BottomNav() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (width >= BREAKPOINT_DESKTOP) {
    return null;
  }

  const current = activeTabKey(segments);

  return (
    <View
      style={[
        styles.wrap,
        isDark && styles.wrapDark,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}>
      {ITEMS.map((item) => {
        const active = current === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => [
              styles.item,
              active && styles.itemActive,
              active && isDark && styles.itemActiveDark,
              pressed && styles.itemPressed,
            ]}>
            <FontAwesome
              name={item.icon}
              size={18}
              color={
                active
                  ? theme.colors.primary
                  : isDark
                    ? '#A89888'
                    : theme.colors.textMuted
              }
            />
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.tabBar,
    paddingTop: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  wrapDark: {
    backgroundColor: '#252018',
    borderTopColor: '#3D3428',
  },
  item: {
    flex: 1,
    minHeight: 56,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  itemActive: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  itemActiveDark: {
    backgroundColor: '#3D3428',
  },
  itemPressed: {
    opacity: 0.9,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  labelDark: {
    color: '#A89888',
  },
  labelActive: {
    color: theme.colors.primaryDark,
  },
  labelActiveDark: {
    color: theme.colors.accent,
  },
});
