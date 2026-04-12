import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: Props) {
  const { buttonMinHeight, buttonPaddingV, buttonFontSize, isDesktop } =
    useResponsive();
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: buttonMinHeight,
          paddingVertical: buttonPaddingV,
          paddingHorizontal: isDesktop ? 24 : theme.space.md,
        },
        variant === 'primary' && styles.primary,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={isOutline || isGhost ? theme.colors.primary : '#fff'}
        />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: buttonFontSize },
            (isOutline || isGhost) && styles.textOutline,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
  text: {
    color: '#FFFBF7',
    fontWeight: '600',
  },
  textOutline: {
    color: theme.colors.primary,
  },
});
