import { useFocusEffect } from '@react-navigation/native';
import { OrderRowCard } from '@/components/OrderRowCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { useResponsive } from '@/hooks/useResponsive';
import { listOrdersWithDetails } from '@/lib/database';
import { formatDateTime } from '@/lib/format';
import {
  compareOrdersByPriority,
  isFinalOrderStatus,
  isOrderOverdue,
} from '@/lib/orderUtils';
import type { OrderStatus, OrderWithDetails } from '@/types/models';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/types/models';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type OrdersFilter = 'todos' | 'atrasados' | OrderStatus;

type BoardSection = {
  key: 'atrasados' | OrderStatus;
  title: string;
  orders: OrderWithDetails[];
  accent: string;
  emptyLabel?: string;
};

const FILTER_OPTIONS: { key: OrdersFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'atrasados', label: 'Atrasados' },
  ...ORDER_STATUSES.map((status) => ({
    key: status,
    label: ORDER_STATUS_LABELS[status],
  })),
];

const STAGE_ORDER: OrderStatus[] = [
  'pendente',
  'producao',
  'pronto',
  'entregue',
  'cancelado',
];

function statusAccent(status: OrderStatus): string {
  switch (status) {
    case 'pendente':
      return theme.colors.warning;
    case 'producao':
      return theme.colors.accent;
    case 'pronto':
      return theme.colors.success;
    case 'entregue':
      return theme.colors.textMuted;
    case 'cancelado':
      return theme.colors.danger;
    default:
      return theme.colors.primary;
  }
}

export default function PedidosTabScreen() {
  const router = useRouter();
  const { tick } = useDataRefresh();
  const { isDesktop, buttonMinHeight } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrdersFilter>('todos');
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

  const orderedOrders = useMemo(() => {
    const now = new Date();
    return [...orders].sort((a, b) => compareOrdersByPriority(a, b, now));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'todos') {
      return orderedOrders;
    }

    if (filter === 'atrasados') {
      return orderedOrders.filter((order) => isOrderOverdue(order));
    }

    return orderedOrders.filter((order) => order.status === filter);
  }, [filter, orderedOrders]);

  const overdueCount = useMemo(
    () => filteredOrders.filter((order) => isOrderOverdue(order)).length,
    [filteredOrders]
  );

  const activeCount = useMemo(
    () =>
      filteredOrders.filter((order) => !isFinalOrderStatus(order.status)).length,
    [filteredOrders]
  );

  const nextDeadline = useMemo(
    () =>
      filteredOrders.find(
        (order) => !isOrderOverdue(order) && !isFinalOrderStatus(order.status)
      ) ?? null,
    [filteredOrders]
  );

  const sections = useMemo(() => {
    const overdueOrders = filteredOrders.filter((order) =>
      isOrderOverdue(order)
    );
    const remainingOrders = filteredOrders.filter(
      (order) => !isOrderOverdue(order)
    );
    const nextSections: BoardSection[] = [];

    if (overdueOrders.length > 0) {
      nextSections.push({
        key: 'atrasados',
        title: 'Atrasados',
        orders: overdueOrders,
        accent: theme.colors.danger,
        emptyLabel: 'Nenhum pedido em atraso.',
      });
    }

    if (filter === 'atrasados') {
      return nextSections;
    }

    const stagesToShow = filter === 'todos' ? STAGE_ORDER : [filter];

    for (const status of stagesToShow) {
      const rows = remainingOrders.filter((order) => order.status === status);
      const shouldShowSection =
        rows.length > 0 || (filter !== 'todos' && overdueOrders.length === 0);

      if (!shouldShowSection) {
        continue;
      }

      nextSections.push({
        key: status,
        title: ORDER_STATUS_LABELS[status],
        orders: rows,
        accent: statusAccent(status),
        emptyLabel: `Nenhum pedido em ${ORDER_STATUS_LABELS[status].toLowerCase()}.`,
      });
    }

    return nextSections;
  }, [filter, filteredOrders]);

  const desktopSectionWidth = useMemo(() => {
    if (!isDesktop) {
      return '100%';
    }

    return sections.length >= 3 ? '31.8%' : '48.8%';
  }, [isDesktop, sections.length]);

  const filterLabel = useMemo(() => {
    if (filter === 'todos') {
      return 'Todas as etapas';
    }

    if (filter === 'atrasados') {
      return 'Pedidos atrasados';
    }

    return ORDER_STATUS_LABELS[filter];
  }, [filter]);

  const filterContent = FILTER_OPTIONS.map((option) => {
    const active = filter === option.key;

    return (
      <Pressable
        key={option.key}
        onPress={() => setFilter(option.key)}
        style={[
          styles.chip,
          { minHeight: buttonMinHeight },
          active && styles.chipActive,
        ]}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  const sectionsContent =
    sections.length === 0 ? (
      <View style={styles.emptyStateCard}>
        <Text style={styles.empty}>Nenhum pedido neste filtro.</Text>
      </View>
    ) : (
      <View style={[styles.sectionsGrid, isDesktop && styles.sectionsGridDesktop]}>
        {sections.map((section) => (
          <View
            key={section.key}
            style={[
              styles.sectionCard,
              isDesktop ? styles.sectionCardDesktop : styles.sectionCardMobile,
              {
                borderTopColor: section.accent,
                width: isDesktop ? desktopSectionWidth : '100%',
              },
            ]}>
            <SectionTitle
              title={section.title}
              action={
                <View
                  style={[
                    styles.countBadge,
                    { borderColor: section.accent },
                  ]}>
                  <Text
                    style={[styles.countBadgeText, { color: section.accent }]}>
                    {section.orders.length}
                  </Text>
                </View>
              }
            />

            <Text style={styles.sectionHint}>
              {section.orders.length > 0
                ? `${section.orders.length} pedido(s) nesta etapa.`
                : section.emptyLabel}
            </Text>

            {section.orders.length === 0 ? (
              <Text style={styles.emptySection}>{section.emptyLabel}</Text>
            ) : isDesktop ? (
              <ScrollView
                style={styles.sectionListDesktop}
                contentContainerStyle={styles.sectionListContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator>
                {section.orders.map((order) => (
                  <OrderRowCard key={order.id} order={order} compact />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.sectionListMobile}>
                {section.orders.map((order) => (
                  <OrderRowCard key={order.id} order={order} compact />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );

  return (
    <AppScreen
      scroll={!isDesktop}
      bottomPadding={isDesktop ? theme.space.xl * 2 : theme.space.xl * 1.5}>
      <View style={[styles.screen, !isDesktop && styles.screenMobile]}>
        <PageHeader
          title="Pedidos"
          subtitle="A fila sobe atrasos primeiro e depois organiza o restante por prazo de entrega."
          action={
            <PrimaryButton
              title="+ Novo pedido"
              onPress={() => router.push('/pedido/novo')}
            />
          }
        />

        <View style={[styles.summaryGrid, isDesktop && styles.summaryGridDesktop]}>
          <View style={[styles.summaryCard, isDesktop && styles.summaryCardDesktop]}>
            <Text style={styles.summaryLabel}>No filtro</Text>
            <Text style={styles.summaryValue}>{filteredOrders.length}</Text>
            <Text style={styles.summaryHint}>{filterLabel}</Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              isDesktop && styles.summaryCardDesktop,
              overdueCount > 0 && styles.alertCard,
            ]}>
            <Text style={styles.summaryLabel}>Em atraso</Text>
            <Text
              style={[
                styles.summaryValue,
                overdueCount > 0 && styles.summaryValueAlert,
              ]}>
              {overdueCount}
            </Text>
            <Text style={styles.summaryHint}>
              {overdueCount > 0 ? 'Precisam de atencao imediata' : 'Sem atrasos agora'}
            </Text>
          </View>

          <View style={[styles.summaryCard, isDesktop && styles.summaryCardDesktop]}>
            <Text style={styles.summaryLabel}>Ativos</Text>
            <Text style={styles.summaryValue}>{activeCount}</Text>
            <Text style={styles.summaryHint}>Pedidos em andamento</Text>
          </View>

          <View style={[styles.summaryCard, isDesktop && styles.summaryCardDesktop]}>
            <Text style={styles.summaryLabel}>Proximo prazo</Text>
            <Text style={styles.summaryDue} numberOfLines={2}>
              {nextDeadline
                ? formatDateTime(nextDeadline.delivery_at)
                : 'Sem prazo ativo'}
            </Text>
            <Text style={styles.summaryHint}>
              {nextDeadline ? nextDeadline.customer_name : 'Nenhum pedido aberto'}
            </Text>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <View style={[styles.filtersHead, isDesktop && styles.filtersHeadDesktop]}>
            <View style={styles.filtersHeadText}>
              <Text style={styles.filtersTitle}>Filtros Rapidos</Text>
              <Text style={styles.filtersSubtitle}>
                Escolha uma etapa para reduzir a lista e acompanhar mais pedidos por vez.
              </Text>
            </View>

            <View style={styles.filtersResult}>
              <Text style={styles.filtersResultValue}>{filteredOrders.length}</Text>
              <Text style={styles.filtersResultLabel}>visiveis</Text>
            </View>
          </View>

          <View style={[styles.chipsWrap, isDesktop && styles.chipsWrapDesktop]}>
            {filterContent}
          </View>
        </View>

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
          </View>
        ) : isDesktop ? (
          <ScrollView
            style={styles.boardScroll}
            contentContainerStyle={styles.boardScrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled">
            {sectionsContent}
          </ScrollView>
        ) : (
          <View style={styles.mobileBoard}>{sectionsContent}</View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
  },
  screenMobile: {
    flex: 0,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  summaryGridDesktop: {
    gap: theme.space.md,
  },
  summaryCard: {
    width: '48.4%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
  },
  summaryCardDesktop: {
    width: '23.1%',
  },
  alertCard: {
    borderColor: '#D6A19D',
    backgroundColor: '#FFF7F6',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  summaryValueAlert: {
    color: theme.colors.danger,
  },
  summaryHint: {
    marginTop: 6,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  summaryDue: {
    marginTop: 6,
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    lineHeight: 20,
  },
  filtersCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
    marginBottom: theme.space.md,
  },
  filtersHead: {
    gap: theme.space.sm,
  },
  filtersHeadDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  filtersHeadText: {
    flex: 1,
  },
  filtersTitle: {
    fontSize: theme.font.caption,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  filtersSubtitle: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  filtersResult: {
    alignSelf: 'flex-start',
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  filtersResultValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  filtersResultLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  chipsWrapDesktop: {
    gap: theme.space.md,
  },
  chip: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFBF7',
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    marginTop: theme.space.md,
  },
  boardScroll: {
    flex: 1,
    minHeight: 0,
  },
  boardScrollContent: {
    paddingBottom: theme.space.xl,
  },
  mobileBoard: {
    width: '100%',
    paddingBottom: theme.space.sm,
  },
  emptyStateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: theme.font.body,
    lineHeight: 22,
  },
  sectionsGrid: {
    gap: theme.space.md,
  },
  sectionsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: theme.space.md,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 4,
    padding: theme.space.md,
  },
  sectionCardDesktop: {
    minHeight: 240,
  },
  sectionCardMobile: {
    width: '100%',
  },
  sectionHint: {
    marginTop: -2,
    marginBottom: theme.space.sm,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  sectionListDesktop: {
    maxHeight: 520,
    minHeight: 140,
    paddingRight: 4,
  },
  sectionListContent: {
    paddingBottom: 2,
  },
  sectionListMobile: {
    width: '100%',
    paddingBottom: 2,
  },
  countBadge: {
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  countBadgeText: {
    fontWeight: '800',
    fontSize: theme.font.caption,
  },
  emptySection: {
    color: theme.colors.textMuted,
    marginBottom: theme.space.sm,
    lineHeight: 20,
  },
});
