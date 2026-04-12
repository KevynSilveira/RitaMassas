import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import DateTimePicker from '@react-native-community/datetimepicker';
import { endOfDay, startOfDay } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  from: Date;
  to: Date;
  onChangeFrom: (d: Date) => void;
  onChangeTo: (d: Date) => void;
};

export function PeriodFilter({ from, to, onChangeFrom, onChangeTo }: Props) {
  const { isDesktop } = useResponsive();
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  return (
    <View style={[styles.wrap, isDesktop && styles.wrapDesktop]}>
      <Pressable
        onPress={() => setShowFrom(true)}
        style={[styles.btn, isDesktop && styles.btnDesktop]}>
        <Text style={styles.btnLabel}>De</Text>
        <Text style={styles.btnVal}>{from.toLocaleDateString('pt-BR')}</Text>
      </Pressable>

      <Pressable
        onPress={() => setShowTo(true)}
        style={[styles.btn, isDesktop && styles.btnDesktop]}>
        <Text style={styles.btnLabel}>Ate</Text>
        <Text style={styles.btnVal}>{to.toLocaleDateString('pt-BR')}</Text>
      </Pressable>

      {showFrom ? (
        <DateTimePicker
          value={from}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, nextValue) => {
            setShowFrom(Platform.OS === 'ios');
            if (nextValue) {
              onChangeFrom(startOfDay(nextValue));
            }
          }}
        />
      ) : null}

      {showTo ? (
        <DateTimePicker
          value={to}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, nextValue) => {
            setShowTo(Platform.OS === 'ios');
            if (nextValue) {
              onChangeTo(endOfDay(nextValue));
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  wrapDesktop: {
    flexDirection: 'row',
  },
  btn: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnDesktop: {
    flex: 1,
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  btnVal: {
    marginTop: 4,
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
