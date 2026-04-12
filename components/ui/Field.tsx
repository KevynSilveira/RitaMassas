import { theme } from '@/constants/theme';
import { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'decimal-pad';
  style?: StyleProp<ViewStyle>;
  hint?: string;
  error?: string | null;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = 'default',
  style,
  hint,
  error,
  maxLength,
  autoCapitalize = 'sentences',
}: InputProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

type ReadProps = { label: string; children: ReactNode; style?: StyleProp<ViewStyle> };

export function ReadField({ label, children, style }: ReadProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readBox}>
        {typeof children === 'string' ? (
          <Text style={styles.readText}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.md },
  label: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: 12,
    fontSize: theme.font.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  hintText: {
    marginTop: theme.space.xs,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  errorText: {
    marginTop: theme.space.xs,
    fontSize: 12,
    color: theme.colors.danger,
    lineHeight: 17,
    fontWeight: '600',
  },
  readBox: {
    paddingVertical: 10,
    paddingHorizontal: theme.space.sm,
  },
  readText: { fontSize: theme.font.body, color: theme.colors.text },
});
