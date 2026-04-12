import { useFocusEffect } from '@react-navigation/native';
import { BrandMark } from '@/components/branding/BrandMark';
import { OrderRowCard } from '@/components/OrderRowCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { useResponsive } from '@/hooks/useResponsive';
import { listOrdersWithDetails } from '@/lib/database';
import { formatMoney } from '@/lib/format';
import {
  compareOrdersByPriority,
  isFinalOrderStatus,
  isOrderOverdue,
} from '@/lib/orderUtils';
import type { OrderWithDetails } from '@/types/models';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type MetricTone = 'default' | 'success' | 'danger' | 'warning';

type SummaryMetric = {
  label: string;
  value: string;
  helper: string;
  tone?: MetricTone;
};

function shiftDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function isBetween(iso: string, start: Date, end: Date) {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function sumOrders(orders: OrderWithDetails[]) {
  return orders.reduce((sum, order) => sum + order.total, 0);
}

function formatCount(count: number) {
  return count === 1 ? '1 pedido' : `${count} pedidos`;
}

function formatGrowth(current: number, previous: number) {
  const delta = current - previous;

  if (previous === 0) {
    if (current === 0) {
      return {
        value: '0%',
        helper: 'Mesmo volume da semana anterior.',
        tone: 'default' as MetricTone,
      };
    }

    return {
      value: '+100%',
      helper: 'Semana anterior sem pedidos para comparar.',
      tone: 'success' as MetricTone,
    };
  }

  const percent = Math.round((delta / previous) * 100);
  const sign = percent > 0 ? '+' : '';

  return {
    value: `${sign}${percent}%`,
    helper:
      delta === 0
        ? 'Mesmo volume da semana anterior.'
        : `${delta > 0 ? '+' : ''}${delta} pedido(s) vs 7 dias anteriores.`,
    tone:
      percent > 0
        ? ('success' as MetricTone)
        : percent < 0
          ? ('danger' as MetricTone)
          : ('default' as MetricTone),
  };
}

function metricToneStyles(tone: MetricTone = 'default') {
  switch (tone) {
    case 'success':
      return {
        borderColor: '#BCD4B0',
        valueColor: theme.colors.success,
        helperColor: theme.colors.success,
      };
    case 'danger':
      return {
        borderColor: '#E7B5B3',
        valueColor: theme.colors.danger,
        helperColor: theme.colors.danger,
      };
    case 'warning':
      return {
        borderColor: '#E6C88A',
        valueColor: theme.colors.warning,
        helperColor: theme.colors.warning,
      };
    default:
      return {
        borderColor: theme.colors.border,
        valueColor: theme.colors.primaryDark,
        helperColor: theme.colors.textSecondary,
      };
  }
}

export default function InicioScreen() {
  const { tick } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listOrdersWithDetails());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, tick])
  );

  const dashboard = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const last30Start = startOfDay(shiftDays(todayStart, -29));
    const currentWeekStart = startOfDay(shiftDays(todayStart, -6));
    const previousWeekStart = startOfDay(shiftDays(todayStart, -13));
    const previousWeekEnd = endOfDay(shiftDays(todayStart, -7));

    const created30 = orders.filter((order) =>
      isBetween(order.created_at, last30Start, todayEnd)
    );
    const created30Valid = created30.filter((order) => order.status !== 'cancelado');
    const delivered30 = orders.filter(
      (order) =>
        order.status === 'entregue' &&
        isBetween(order.delivery_at, last30Start, todayEnd)
    );
    const cancelled30 = created30.filter((order) => order.status === 'cancelado');

    const currentWeekCreated = orders.filter((order) =>
      isBetween(order.created_at, currentWeekStart, todayEnd)
    );
    const currentWeekValid = currentWeekCreated.filter(
      (order) => order.status !== 'cancelado'
    );
    const previousWeekCreated = orders.filter((order) =>
      isBetween(order.created_at, previousWeekStart, previousWeekEnd)
    );

    const activeOrders = orders.filter((order) => !isFinalOrderStatus(order.status));
    const overdueOrders = activeOrders
      .filter((order) => isOrderOverdue(order, now))
      .sort((a, b) => compareOrdersByPriority(a, b, now));
    const nextOrders = activeOrders
      .filter((order) => !isOrderOverdue(order, now))
      .sort((a, b) => compareOrdersByPriority(a, b, now));

    const readyOrders = activeOrders.filter((order) => order.status === 'pronto');
    const productionOrders = activeOrders.filter(
      (order) => order.status === 'producao'
    );
    const pendingOrders = activeOrders.filter((order) => order.status === 'pendente');

    const created30Value = sumOrders(created30Valid);
    const delivered30Value = sumOrders(delivered30);
    const currentWeekValue = sumOrders(currentWeekValid);
    const activeValue = sumOrders(activeOrders);
    const overdueValue = sumOrders(overdueOrders);
    const cancelled30Value = sumOrders(cancelled30);
    const averageTicket30 =
      created30Valid.length > 0 ? created30Value / created30Valid.length : 0;

    return {
      summary: [
        {
          label: 'Pedidos (30 dias)',
          value: String(created30.length),
          helper: `${formatMoney(created30Value)} em pedidos no periodo.`,
        },
        {
          label: 'Entregues (30 dias)',
          value: String(delivered30.length),
          helper: `${formatMoney(delivered30Value)} concluidos no periodo.`,
          tone: 'success' as MetricTone,
        },
        {
          label: 'Ultima semana',
          value: String(currentWeekCreated.length),
          helper: `${formatMoney(currentWeekValue)} em novos pedidos.`,
        },
        {
          label: 'Crescimento semanal',
          ...formatGrowth(currentWeekCreated.length, previousWeekCreated.length),
        },
        {
          label: 'Atrasados agora',
          value: String(overdueOrders.length),
          helper:
            overdueOrders.length > 0
              ? `${formatMoney(overdueValue)} em risco na fila.`
              : 'Nenhum atraso aberto agora.',
          tone: overdueOrders.length > 0 ? ('danger' as MetricTone) : undefined,
        },
        {
          label: 'Fila ativa',
          value: String(activeOrders.length),
          helper:
            activeOrders.length > 0
              ? `${formatMoney(activeValue)} em pedidos ativos.`
              : 'Sem pedidos ativos no momento.',
          tone: activeOrders.length > 0 ? ('warning' as MetricTone) : undefined,
        },
      ] satisfies SummaryMetric[],
      operations: [
        {
          label: 'Pendentes',
          count: pendingOrders.length,
          value: sumOrders(pendingOrders),
          tone: 'warning' as MetricTone,
        },
        {
          label: 'Em producao',
          count: productionOrders.length,
          value: sumOrders(productionOrders),
          tone: 'default' as MetricTone,
        },
        {
          label: 'Prontos',
          count: readyOrders.length,
          value: sumOrders(readyOrders),
          tone: 'success' as MetricTone,
        },
        {
          label: 'Atrasados',
          count: overdueOrders.length,
          value: overdueValue,
          tone: 'danger' as MetricTone,
        },
      ],
      finance: [
        {
          label: 'Ticket medio (30 dias)',
          value: formatMoney(averageTicket30),
          helper: `${formatCount(created30Valid.length)} validos no periodo.`,
        },
        {
          label: 'Valor entregue',
          value: formatMoney(delivered30Value),
          helper: `${formatCount(delivered30.length)} com status entregue.`,
        },
        {
          label: 'Cancelados (30 dias)',
          value: String(cancelled30.length),
          helper:
            cancelled30.length > 0
              ? `${formatMoney(cancelled30Value)} cancelados no periodo.`
              : 'Nenhum cancelamento recente.',
        },
      ],
      overdueOrders: overdueOrders.slice(0, 4),
      nextOrders: nextOrders.slice(0, 4),
      hasOrders: orders.length > 0,
    };
  }, [orders]);

  return (
    <AppScreen>
      <PageHeader
        title={
          <View style={styles.brandTitleRow}>
            <BrandMark size={isDesktop ? 40 : 34} />
            <Text style={styles.brandTitleText}>Rita Massas</Text>
          </View>
        }
        subtitle="Dashboard operacional com pedidos, entregas, valores e crescimento recente."
      />

      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
      ) : (
        <>
          <View style={[styles.metricsGrid, isDesktop && styles.metricsGridDesktop]}>
            {dashboard.summary.map((metric) => {
              const tone = metricToneStyles(metric.tone);

              return (
                <View
                  key={metric.label}
                  style={[
                    styles.metricCard,
                    isDesktop && styles.metricCardDesktop,
                    { borderColor: tone.borderColor },
                  ]}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={[styles.metricValue, { color: tone.valueColor }]}>
                    {metric.value}
                  </Text>
                  <Text style={[styles.metricHelper, { color: tone.helperColor }]}>
                    {metric.helper}
                  </Text>
                </View>
              );
            })}
          </View>

          <View
            style={[styles.overviewGrid, isDesktop && styles.overviewGridDesktop]}>
            <View style={styles.panel}>
              <SectionTitle title="Operacao Atual" />
              {dashboard.operations.map((row) => {
                const tone = metricToneStyles(row.tone);

                return (
                  <View key={row.label} style={styles.operationRow}>
                    <View style={styles.operationText}>
                      <Text style={styles.operationLabel}>{row.label}</Text>
                      <Text style={styles.operationSub}>
                        {formatMoney(row.value)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.operationBadge,
                        { borderColor: tone.borderColor },
                      ]}>
                      <Text
                        style={[
                          styles.operationBadgeText,
                          { color: tone.valueColor },
                        ]}>
                        {row.count}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.panel}>
              <SectionTitle title="Resumo Financeiro" />
              {dashboard.finance.map((item) => (
                <View key={item.label} style={styles.financeRow}>
                  <Text style={styles.financeLabel}>{item.label}</Text>
                  <Text style={styles.financeValue}>{item.value}</Text>
                  <Text style={styles.financeHelper}>{item.helper}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.watchGrid, isDesktop && styles.watchGridDesktop]}>
            <View style={[styles.panel, !isDesktop && styles.panelMobile]}>
              <SectionTitle title="Pedidos Em Atraso" />
              {dashboard.overdueOrders.length === 0 ? (
                <Text style={styles.empty}>
                  Nenhum pedido em atraso. A operacao esta em dia.
                </Text>
              ) : (
                dashboard.overdueOrders.map((order) => (
                  <OrderRowCard key={order.id} order={order} />
                ))
              )}
            </View>

            <View style={[styles.panel, !isDesktop && styles.panelMobile]}>
              <SectionTitle title="Proximos Prazos" />
              {dashboard.nextOrders.length === 0 ? (
                <Text style={styles.empty}>
                  Sem pedidos ativos com prazo futuro.
                </Text>
              ) : (
                dashboard.nextOrders.map((order) => (
                  <OrderRowCard key={order.id} order={order} />
                ))
              )}
            </View>
          </View>

          {!dashboard.hasOrders ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyPanelTitle}>Sem historico suficiente</Text>
              <Text style={styles.empty}>
                O dashboard sera preenchido automaticamente conforme os pedidos
                forem sendo cadastrados e atualizados.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: theme.space.md,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  brandTitleText: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: -0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginBottom: theme.space.lg,
  },
  metricsGridDesktop: {
    gap: theme.space.md,
  },
  metricCard: {
    width: '100%',
    minHeight: 134,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.space.md,
  },
  metricCardDesktop: {
    width: '31.6%',
  },
  metricLabel: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '800',
  },
  metricHelper: {
    marginTop: 8,
    fontSize: theme.font.caption,
    lineHeight: 19,
  },
  overviewGrid: {
    gap: theme.space.md,
    marginBottom: theme.space.lg,
  },
  overviewGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  watchGrid: {
    gap: theme.space.md,
  },
  watchGridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  panel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
  },
  panelMobile: {
    flex: 0,
  },
  operationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  operationText: {
    flex: 1,
  },
  operationLabel: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  operationSub: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  operationBadge: {
    minWidth: 42,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  operationBadgeText: {
    fontSize: theme.font.caption,
    fontWeight: '800',
  },
  financeRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  financeLabel: {
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financeValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  financeHelper: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  empty: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  emptyPanel: {
    marginTop: theme.space.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
  },
  emptyPanelTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    marginBottom: theme.space.sm,
  },
});
