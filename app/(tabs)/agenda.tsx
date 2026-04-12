import { useFocusEffect } from '@react-navigation/native';
import { OrderRowCard } from '@/components/OrderRowCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { useResponsive } from '@/hooks/useResponsive';
import { ordersForCalendarMonth } from '@/lib/database';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function toDayKey(value: Date | string) {
  const baseDate = typeof value === 'string' ? parseISO(value) : value;
  return format(baseDate, 'yyyy-MM-dd');
}

function formatDayLabel(value: string) {
  try {
    return format(parseISO(`${value}T00:00:00`), "dd 'de' MMMM", {
      locale: ptBR,
    });
  } catch {
    return value;
  }
}

function capitalizeMonthLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AgendaScreen() {
  const { tick } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const [cursor, setCursor] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<
    Awaited<ReturnType<typeof ordersForCalendarMonth>>
  >([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ordersForCalendarMonth(year, month);
      setOrders(list);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, tick])
  );

  useEffect(() => {
    setSelectedDayKey(null);
  }, [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof orders>();

    for (const order of orders) {
      const key = toDayKey(order.delivery_at);
      const current = map.get(key) ?? [];
      current.push(order);
      map.set(key, current);
    }

    return map;
  }, [orders]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const leadingBlanks = useMemo(() => startOfMonth(cursor).getDay(), [cursor]);

  const trailingBlanks = useMemo(() => {
    const totalCells = leadingBlanks + daysInMonth.length;
    return (7 - (totalCells % 7)) % 7;
  }, [daysInMonth.length, leadingBlanks]);

  const monthLabel = capitalizeMonthLabel(
    format(cursor, 'MMMM yyyy', { locale: ptBR })
  );
  const todayKey = toDayKey(new Date());
  const selectedOrders = selectedDayKey ? byDay.get(selectedDayKey) ?? [] : orders;
  const selectedPeriodTitle = selectedDayKey
    ? `Entregas em ${formatDayLabel(selectedDayKey)}`
    : `Pedidos de ${monthLabel}`;
  const selectedPeriodHint = selectedDayKey
    ? `${selectedOrders.length} pedido(s) para a data selecionada.`
    : `${orders.length} pedido(s) programado(s) neste mes.`;
  const selectedBadgeLabel = selectedDayKey ? 'Dia' : 'Mes';
  const summaryLabels = isDesktop
    ? {
        orders: 'Pedidos no mes',
        days: 'Dias com entrega',
        period: 'Periodo atual',
      }
    : {
        orders: 'Pedidos',
        days: 'Dias',
        period: 'Periodo',
      };
  const pageSubtitle = isDesktop
    ? 'Calendario na esquerda e pedidos do periodo na coluna da direita.'
    : 'Visualize os pedidos por data e acompanhe rapidamente o mes.';

  const calendarPanel = (
    <View style={styles.panel}>
      <View style={[styles.calendarHead, isDesktop && styles.calendarHeadDesktop]}>
        <Text style={styles.panelEyebrow}>Agenda do mes</Text>
        <View style={[styles.monthRow, isDesktop && styles.monthRowDesktop]}>
          <Text style={[styles.monthTitle, !isDesktop && styles.monthTitleMobile]}>
            {monthLabel}
          </Text>

          <View style={styles.navGroup}>
            <Pressable
              onPress={() => setCursor((date) => addMonths(date, -1))}
              style={({ pressed }) => [
                styles.navButton,
                !isDesktop && styles.navButtonMobile,
                pressed && styles.navButtonPressed,
              ]}>
              <Text style={styles.navButtonText}>{'<'}</Text>
            </Pressable>

            <Pressable
              onPress={() => setCursor((date) => addMonths(date, 1))}
              style={({ pressed }) => [
                styles.navButton,
                !isDesktop && styles.navButtonMobile,
                pressed && styles.navButtonPressed,
              ]}>
              <Text style={styles.navButtonText}>{'>'}</Text>
            </Pressable>
          </View>
        </View>
        <Text style={[styles.panelHint, !isDesktop && styles.panelHintMobile]}>
          Toque em um dia para ver so os pedidos daquela data.
        </Text>
      </View>

      <View style={[styles.summaryStrip, isDesktop && styles.summaryStripDesktop]}>
        <View
          style={[
            styles.summaryCard,
            isDesktop ? styles.summaryCardDesktop : styles.summaryCardMobile,
          ]}>
          <Text style={styles.summaryLabel} numberOfLines={1}>
            {summaryLabels.orders}
          </Text>
          <Text style={styles.summaryValue}>{orders.length}</Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            isDesktop ? styles.summaryCardDesktop : styles.summaryCardMobile,
          ]}>
          <Text style={styles.summaryLabel} numberOfLines={1}>
            {summaryLabels.days}
          </Text>
          <Text style={styles.summaryValue}>{byDay.size}</Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            isDesktop ? styles.summaryCardDesktop : styles.summaryCardMobile,
          ]}>
          <Text style={styles.summaryLabel} numberOfLines={1}>
            {summaryLabels.period}
          </Text>
          <Text
            style={[styles.summaryValueSmall, !isDesktop && styles.summaryValueSmallMobile]}
            numberOfLines={2}>
            {selectedDayKey ? formatDayLabel(selectedDayKey) : 'Mes inteiro'}
          </Text>
        </View>
      </View>

      <View style={styles.calendarSurface}>
        <View style={styles.weekRow}>
          {WEEK_LABELS.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekDay}>
              {label}
            </Text>
          ))}
        </View>

        {loading ? (
          <View style={styles.calendarLoading}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <View key={`leading-${index}`} style={styles.blankCell} />
            ))}

            {daysInMonth.map((day) => {
              const key = toDayKey(day);
              const count = byDay.get(key)?.length ?? 0;
              const selected = selectedDayKey === key;
              const isToday = todayKey === key;

              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => setSelectedDayKey(selected ? null : key)}
                  style={({ pressed }) => [
                    styles.cell,
                    !isDesktop && styles.cellMobile,
                    selected && styles.cellSelected,
                    isToday && styles.cellToday,
                    pressed && styles.cellPressed,
                  ]}>
                  <Text
                    style={[
                      styles.cellNum,
                      selected && styles.cellNumSelected,
                      isToday && styles.cellNumToday,
                    ]}>
                    {format(day, 'd')}
                  </Text>

                  {count > 0 ? (
                    <View
                      style={[
                        styles.countBadge,
                        styles.countBadgeFloating,
                        !isDesktop && styles.countBadgeFloatingMobile,
                        selected && styles.countBadgeSelected,
                      ]}>
                      <Text
                        style={[
                          styles.countBadgeText,
                          selected && styles.countBadgeTextSelected,
                        ]}>
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            {Array.from({ length: trailingBlanks }).map((_, index) => (
              <View key={`trailing-${index}`} style={styles.blankCell} />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.selectionFooter, isDesktop && styles.selectionFooterDesktop]}>
        <Text style={styles.selectionText}>
          {selectedDayKey
            ? `Periodo selecionado: ${formatDayLabel(selectedDayKey)}`
            : 'Periodo selecionado: mes inteiro'}
        </Text>

        {selectedDayKey ? (
          <Pressable
            onPress={() => setSelectedDayKey(null)}
            style={({ pressed }) => [
              styles.clearSelectionButton,
              pressed && styles.clearSelectionPressed,
            ]}>
            <Text style={styles.clearSelectionText}>Ver mes inteiro</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const ordersPanel = (
    <View style={[styles.panel, styles.ordersPanel]}>
      <View style={[styles.ordersHead, isDesktop && styles.ordersHeadDesktop]}>
        <View style={styles.ordersHeadText}>
          <Text style={styles.panelEyebrow}>{selectedBadgeLabel}</Text>
          <Text style={styles.ordersTitle}>{selectedPeriodTitle}</Text>
          <Text style={styles.panelHint}>{selectedPeriodHint}</Text>
        </View>

        <View style={styles.periodBadge}>
          <Text style={styles.periodBadgeValue}>{selectedOrders.length}</Text>
          <Text style={styles.periodBadgeLabel}>pedidos</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.ordersState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : selectedOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sem pedidos neste periodo</Text>
          <Text style={styles.emptyText}>
            Escolha outro dia no calendario ou troque o mes para consultar
            entregas diferentes.
          </Text>
        </View>
      ) : isDesktop ? (
        <ScrollView
          style={styles.ordersScroll}
          contentContainerStyle={styles.ordersScrollContent}
          showsVerticalScrollIndicator>
          {selectedOrders.map((order) => (
            <OrderRowCard key={order.id} order={order} compact />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.ordersList}>
          {selectedOrders.map((order) => (
            <OrderRowCard key={order.id} order={order} />
          ))}
        </View>
      )}
    </View>
  );

  if (isDesktop) {
    return (
      <AppScreen
        scroll={false}
        maxWidth={1280}
        bottomPadding={theme.space.lg}
        contentStyle={styles.desktopScreen}>
        <PageHeader title="Agenda" subtitle={pageSubtitle} />

        <View style={styles.desktopBody}>
          <View style={styles.desktopCalendarColumn}>{calendarPanel}</View>
          <View style={styles.desktopOrdersColumn}>{ordersPanel}</View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen bottomPadding={theme.space.xl * 1.5}>
      <PageHeader title="Agenda" subtitle={pageSubtitle} />

      <View style={styles.mobileStack}>
        <View style={styles.mobileCalendarColumn}>{calendarPanel}</View>
        <View style={styles.mobileOrdersColumn}>{ordersPanel}</View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  desktopScreen: {
    flex: 1,
    minHeight: 0,
  },
  desktopBody: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    flexDirection: 'row',
    gap: theme.space.lg,
    alignItems: 'stretch',
  },
  desktopCalendarColumn: {
    flex: 1.35,
    minWidth: 0,
  },
  desktopOrdersColumn: {
    flex: 0.9,
    minWidth: 360,
    maxWidth: 440,
    minHeight: 0,
  },
  mobileStack: {
    width: '100%',
    gap: theme.space.md,
  },
  mobileCalendarColumn: {
    width: '100%',
  },
  mobileOrdersColumn: {
    width: '100%',
  },
  layout: {
    gap: theme.space.md,
  },
  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  calendarColumn: {
    width: '100%',
  },
  calendarColumnDesktop: {
    flex: 1.45,
    minWidth: 0,
  },
  ordersColumn: {
    width: '100%',
  },
  ordersColumnDesktop: {
    flex: 0.95,
    minWidth: 320,
    maxWidth: 420,
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
  },
  calendarHead: {
    gap: theme.space.sm,
  },
  calendarHeadDesktop: {
    gap: theme.space.xs,
  },
  calendarHeadText: {
    width: '100%',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  monthRowDesktop: {
    alignItems: 'flex-start',
  },
  panelEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  monthTitle: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    flex: 1,
    minWidth: 0,
  },
  monthTitleMobile: {
    marginTop: 0,
    fontSize: 18,
  },
  panelHint: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  panelHintMobile: {
    lineHeight: 20,
  },
  navGroup: {
    flexDirection: 'row',
    gap: theme.space.sm,
    flexShrink: 0,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonMobile: {
    width: 40,
    height: 40,
  },
  navButtonPressed: {
    opacity: 0.88,
  },
  navButtonText: {
    fontSize: 22,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  summaryStrip: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  summaryStripDesktop: {
    gap: theme.space.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
  },
  summaryCardDesktop: {
    minHeight: 88,
  },
  summaryCardMobile: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.sm,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  summaryValueSmall: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 20,
  },
  summaryValueSmallMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  calendarSurface: {
    marginTop: theme.space.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: theme.space.sm,
  },
  weekDay: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  calendarLoading: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.2857%',
    aspectRatio: 1,
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: theme.radius.md,
    position: 'relative',
  },
  cellMobile: {
    aspectRatio: 0.76,
    paddingTop: 6,
    paddingBottom: 10,
  },
  blankCell: {
    width: '14.2857%',
    aspectRatio: 1,
  },
  cellSelected: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  cellPressed: {
    opacity: 0.88,
  },
  cellNum: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cellNumSelected: {
    color: theme.colors.primaryDark,
  },
  cellNumToday: {
    color: theme.colors.primary,
  },
  countBadge: {
    position: 'absolute',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeFloating: {
    top: 26,
    right: 10,
  },
  countBadgeFloatingMobile: {
    top: 22,
    right: -1,
    minWidth: 16,
    height: 16,
  },
  countBadgeSelected: {
    backgroundColor: theme.colors.primaryDark,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFBF7',
  },
  countBadgeTextSelected: {
    color: '#FFFBF7',
  },
  selectionFooter: {
    marginTop: theme.space.md,
    gap: theme.space.sm,
  },
  selectionFooterDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  clearSelectionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  clearSelectionPressed: {
    opacity: 0.88,
  },
  clearSelectionText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  ordersPanel: {
    minHeight: 240,
    height: '100%',
  },
  ordersHead: {
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  ordersHeadDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  ordersHeadText: {
    flex: 1,
    minWidth: 0,
  },
  ordersTitle: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  periodBadge: {
    alignSelf: 'flex-start',
    minWidth: 82,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  periodBadgeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  periodBadgeLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ordersState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersScroll: {
    flex: 1,
    minHeight: 260,
  },
  ordersScrollContent: {
    paddingBottom: theme.space.xs,
  },
  ordersList: {
    gap: theme.space.sm,
  },
  emptyCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  emptyText: {
    marginTop: 4,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
