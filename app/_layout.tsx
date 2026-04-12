import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { theme } from '@/constants/theme';
import { DataProvider, useDataRefresh } from '@/context/DataContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <DataProvider>
      <RootLayoutContent />
    </DataProvider>
  );
}

function RootLayoutContent() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const { ready } = useDataRefresh();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [loaded, ready]);

  if (!loaded || !ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isDesktop } = useResponsive();
  const navTheme =
    colorScheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: theme.colors.accent,
            background: '#1A1510',
            card: '#252018',
            text: '#F5F0EB',
            border: '#3D3428',
            notification: theme.colors.accent,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.accent,
          },
        };

  const stack = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: navTheme.colors.card },
        headerTintColor: navTheme.colors.primary,
        headerTitleStyle: {
          fontWeight: '700',
          color: navTheme.colors.text,
        },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pedido" options={{ headerShown: false }} />
      <Stack.Screen name="clientes" options={{ headerShown: false }} />
      <Stack.Screen name="produtos" options={{ headerShown: false }} />
      <Stack.Screen name="busca" options={{ headerShown: false }} />
      <Stack.Screen name="relatorios" options={{ headerShown: false }} />
    </Stack>
  );

  return (
    <ThemeProvider value={navTheme}>
      {isDesktop ? (
        <View style={styles.shell}>
          <SidebarNav />
          <View style={styles.main}>{stack}</View>
        </View>
      ) : (
        <View style={styles.mobileShell}>
          <View style={styles.main}>{stack}</View>
          <BottomNav />
        </View>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  mobileShell: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.background,
  },
  main: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
});
