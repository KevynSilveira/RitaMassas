import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/constants/theme';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
};

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  style,
  autoFocus = false,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <FontAwesome name="search" size={16} color={theme.colors.textMuted} />

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
      />

      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
          <FontAwesome
            name="times-circle"
            size={16}
            color={theme.colors.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    gap: theme.space.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: theme.font.body,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});

