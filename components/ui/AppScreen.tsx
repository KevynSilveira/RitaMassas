import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { ReactNode } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  maxWidth?: number;
  bottomPadding?: number;
};

export function AppScreen({
  children,
  scroll = true,
  contentStyle,
  edges = ['top', 'bottom'],
  maxWidth,
  bottomPadding,
}: Props) {
  const { isDesktop, contentMaxWidth, screenPadding } = useResponsive();
  const resolvedMaxWidth = maxWidth ?? contentMaxWidth;
  const resolvedBottomPadding =
    bottomPadding ?? (isDesktop ? theme.space.xl * 2 : theme.space.md);
  const resolvedTopPadding = isDesktop ? theme.space.md : theme.space.lg;

  const pad = {
    paddingTop: resolvedTopPadding,
    paddingHorizontal: screenPadding,
    paddingBottom: resolvedBottomPadding,
  };

  const innerWrap: ViewStyle = {
    width: '100%',
    ...(resolvedMaxWidth != null ? { maxWidth: resolvedMaxWidth } : {}),
    alignSelf: isDesktop ? 'center' : 'stretch',
    flex: 1,
    minHeight: 0,
  };

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[innerWrap, styles.fillGrow]}>
        {scroll ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={[pad, styles.scrollContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={isDesktop}>
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.fill,
              {
                paddingTop: resolvedTopPadding,
                paddingHorizontal: screenPadding,
              },
              contentStyle,
            ]}>
            {children}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fillGrow: { minHeight: 0 },
  fill: { flex: 1, minHeight: 0 },
});
