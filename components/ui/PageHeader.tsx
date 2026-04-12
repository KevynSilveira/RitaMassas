import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string | ReactNode;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
};

export function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  backLabel = 'Voltar',
}: Props) {
  const { isDesktop } = useResponsive();
  const titleSize = isDesktop ? 26 : theme.font.title;
  const subtitleSize = isDesktop ? theme.font.body : 14;

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}>
          <FontAwesome
            name="chevron-left"
            size={12}
            color={theme.colors.primary}
          />
          <Text style={styles.backLabel}>{backLabel}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.wrap, isDesktop && styles.wrapDesktop]}>
        <View style={styles.textWrap}>
          {typeof title === 'string' ? (
            <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
          ) : (
            title
          )}
          {subtitle ? (
            <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {action ? (
          <View style={[styles.actionWrap, isDesktop && styles.actionWrapDesktop]}>
            {action}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.space.lg,
    gap: theme.space.sm,
  },
  containerMobile: {
    paddingTop: theme.space.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingVertical: theme.space.xs,
  },
  backButtonPressed: {
    opacity: 0.72,
  },
  backLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  wrap: {
    gap: theme.space.md,
  },
  wrapDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textWrap: {
    flex: 1,
    gap: theme.space.xs,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  subtitle: {
    fontSize: theme.font.body,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  actionWrap: {
    width: '100%',
  },
  actionWrapDesktop: {
    width: 220,
    marginLeft: theme.space.lg,
  },
});
