import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import {
  DELIVERY_TIME_OPTIONS,
  buildDeliveryDate,
  getNextAvailableDelivery,
  validateDeliveryDate,
} from '@/lib/orderEditor';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  title?: string;
  value: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatTimeValue(date: Date) {
  return format(date, 'HH:mm', { locale: ptBR });
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function CalendarPickerModal({
  visible,
  title = 'Escolher data',
  value,
  onClose,
  onConfirm,
}: Props) {
  const { isDesktop } = useResponsive();
  const [cursor, setCursor] = useState(() => startOfMonth(value));
  const [draft, setDraft] = useState(value);
  const [timeText, setTimeText] = useState(() => formatTimeValue(value));

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraft(value);
    setCursor(startOfMonth(value));
    setTimeText(formatTimeValue(value));
  }, [value, visible]);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(cursor),
      end: endOfMonth(cursor),
    });
  }, [cursor]);

  const leadingBlanks = useMemo(() => startOfMonth(cursor).getDay(), [cursor]);
  const monthLabel = format(cursor, 'MMMM yyyy', { locale: ptBR });
  const today = new Date();
  const previousMonthDisabled =
    endOfMonth(addMonths(cursor, -1)).getTime() < startOfDay(today).getTime();
  const selectedLabel = `${format(draft, "dd 'de' MMMM", {
    locale: ptBR,
  })} as ${timeText || formatTimeValue(draft)}`;

  const confirmSelection = () => {
    const nextDate = buildDeliveryDate(draft, timeText);

    if (!nextDate) {
      Alert.alert('Horario', 'Informe um horario valido no formato 14:30.');
      return;
    }

    const deliveryError = validateDeliveryDate(nextDate);
    if (deliveryError) {
      Alert.alert(deliveryError.title, deliveryError.message);
      return;
    }

    onConfirm(nextDate);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, isDesktop && styles.overlayDesktop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, isDesktop && styles.sheetDesktop]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{selectedLabel}</Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Pressable
              onPress={() => {
                if (previousMonthDisabled) {
                  Alert.alert(
                    'Entrega',
                    'Nao e possivel voltar para um mes com datas anteriores ao dia atual.'
                  );
                  return;
                }
                setCursor((current) => addMonths(current, -1));
              }}
              style={[
                styles.monthButton,
                previousMonthDisabled && styles.monthButtonDisabled,
              ]}>
              <Text style={styles.monthButtonText}>{'<'}</Text>
            </Pressable>

            <Text style={styles.monthTitle}>{monthLabel}</Text>

            <Pressable
              onPress={() => setCursor((current) => addMonths(current, 1))}
              style={styles.monthButton}>
              <Text style={styles.monthButtonText}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <View key={`blank-${index}`} style={styles.dayBlank} />
            ))}

            {daysInMonth.map((day) => {
              const selected = isSameDay(day, draft);
              const disabled =
                startOfDay(day).getTime() < startOfDay(today).getTime();

              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => {
                    if (disabled) {
                      Alert.alert(
                        'Entrega',
                        'Nao e possivel selecionar um dia anterior ao atual.'
                      );
                      return;
                    }
                    setDraft(day);
                  }}
                  style={[
                    styles.dayCell,
                    disabled && styles.dayCellDisabled,
                    selected && styles.dayCellSelected,
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayTextDisabled,
                      selected && styles.dayTextSelected,
                    ]}>
                    {format(day, 'd')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.timeSection}>
            <Text style={styles.timeTitle}>Horario de entrega</Text>
            <Text style={styles.timeHint}>
              Digite o horario ou use um dos atalhos abaixo.
            </Text>

            <TextInput
              value={timeText}
              onChangeText={(text) => setTimeText(normalizeTimeInput(text))}
              placeholder="12:00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="default"
              maxLength={5}
              style={styles.timeInput}
            />

            <View style={styles.quickTimes}>
              {DELIVERY_TIME_OPTIONS.map((time) => {
                const active = timeText === time;
                const previewDate = buildDeliveryDate(draft, time);
                const disabled = previewDate
                  ? validateDeliveryDate(previewDate) != null
                  : true;

                return (
                  <Pressable
                    key={time}
                    onPress={() => {
                      if (disabled) {
                        Alert.alert(
                          'Entrega',
                          'Escolha um horario posterior ao momento atual.'
                        );
                        return;
                      }
                      setTimeText(time);
                    }}
                    style={[
                      styles.quickTimeChip,
                      disabled && styles.quickTimeChipDisabled,
                      active && styles.quickTimeChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.quickTimeText,
                        disabled && styles.quickTimeTextDisabled,
                        active && styles.quickTimeTextActive,
                      ]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              title="Hoje"
              onPress={() => {
                const nextAvailable = getNextAvailableDelivery();
                if (!isSameDay(nextAvailable, new Date())) {
                  Alert.alert(
                    'Entrega',
                    'Nao ha mais horarios disponiveis para hoje. Escolha amanha ou outra data futura.'
                  );
                  return;
                }
                setDraft(nextAvailable);
                setCursor(startOfMonth(nextAvailable));
                setTimeText(formatTimeValue(nextAvailable));
              }}
              variant="outline"
              style={styles.secondaryAction}
            />

            <PrimaryButton
              title="Confirmar horario"
              onPress={confirmSelection}
              style={styles.primaryAction}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    paddingTop: theme.space.xl,
  },
  overlayDesktop: {
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  sheet: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.space.md,
  },
  sheetDesktop: {
    alignSelf: 'center',
    maxWidth: 560,
    borderRadius: theme.radius.lg,
    padding: theme.space.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  subtitle: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  closeButton: {
    paddingVertical: 6,
  },
  closeText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  monthRow: {
    marginTop: theme.space.lg,
    marginBottom: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonDisabled: {
    opacity: 0.4,
  },
  monthButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: theme.space.sm,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayBlank: {
    width: '14.2857%',
    height: 46,
  },
  dayCell: {
    width: '14.2857%',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dayTextDisabled: {
    color: theme.colors.textMuted,
  },
  dayTextSelected: {
    color: '#FFFBF7',
  },
  timeSection: {
    marginTop: theme.space.lg,
  },
  timeTitle: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeHint: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: theme.font.caption,
    lineHeight: 18,
  },
  timeInput: {
    marginTop: theme.space.sm,
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space.md,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  quickTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.sm,
  },
  quickTimeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  quickTimeChipDisabled: {
    opacity: 0.4,
  },
  quickTimeChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  quickTimeText: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  quickTimeTextDisabled: {
    color: theme.colors.textMuted,
  },
  quickTimeTextActive: {
    color: '#FFFBF7',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.space.sm,
    marginTop: theme.space.lg,
  },
  secondaryAction: {
    flex: 1,
  },
  primaryAction: {
    flex: 1.5,
  },
});
