import { OrderRowCard } from '@/components/OrderRowCard';
import { PeriodFilter } from '@/components/PeriodFilter';
import { ReportExportActions } from '@/components/reports/ReportExportActions';
import { AppScreen } from '@/components/ui/AppScreen';
import { FormPanel } from '@/components/ui/FormPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { listCustomers, listOrdersWithDetails } from '@/lib/database';
import { formatDateTime, formatMoney } from '@/lib/format';
import {
  buildPeriodLabel,
  exportCsvReport,
  exportPdfReport,
} from '@/lib/reportExport';
import { ORDER_STATUS_LABELS, type CustomerRow } from '@/types/models';
import { endOfDay, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function RelatorioPedidosScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [from, setFrom] = useState(() => startOfMonth(new Date()));
  const [to, setTo] = useState(() => endOfDay(new Date()));
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<
    Awaited<ReturnType<typeof listOrdersWithDetails>>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listOrdersWithDetails({
        from: from.toISOString(),
        to: to.toISOString(),
        customerId: customerId ?? undefined,
      });
      setOrders(list);
    } finally {
      setLoading(false);
    }
  }, [customerId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCustomers().then(setCustomers);
  }, []);

  const totalAmount = useMemo(
    () => orders.reduce((sum, order) => sum + order.total, 0),
    [orders]
  );
  const periodLabel = buildPeriodLabel(from, to);
  const customerLabel = customerName ?? 'Todos os clientes';

  const exportOrdersCsv = useCallback(() => {
    exportCsvReport({
      filename: `relatorio-pedidos-${periodLabel}`,
      columns: [
        'Pedido',
        'Cliente',
        'Entrega',
        'Status',
        'Itens',
        'Total',
        'Observacao',
      ],
      rows: orders.map((order) => [
        order.id,
        order.customer_name,
        formatDateTime(order.delivery_at),
        ORDER_STATUS_LABELS[order.status],
        order.items
          .map((item) => `${item.product_name} x ${item.quantity}`)
          .join(' | '),
        formatMoney(order.total),
        order.notes ?? '',
      ]),
    });
  }, [orders, periodLabel]);

  const exportOrdersPdf = useCallback(() => {
    exportPdfReport({
      filename: `relatorio-pedidos-${periodLabel}`,
      title: 'Relatorio de Pedidos',
      subtitle: `Periodo: ${periodLabel} | Cliente: ${customerLabel}`,
      sections: [
        {
          title: 'Resumo',
          rows: [
            `Pedidos encontrados: ${orders.length}`,
            `Valor total: ${formatMoney(totalAmount)}`,
          ],
        },
        {
          title: 'Pedidos',
          rows:
            orders.length > 0
              ? orders.map(
                  (order) =>
                    `Pedido #${order.id} | ${order.customer_name} | ${formatDateTime(order.delivery_at)} | ${ORDER_STATUS_LABELS[order.status]} | ${formatMoney(order.total)}`
                )
              : ['Nenhum pedido encontrado para o filtro atual.'],
        },
      ],
    });
  }, [customerLabel, orders, periodLabel, totalAmount]);

  return (
    <AppScreen maxWidth={isDesktop ? 1220 : undefined}>
      <PageHeader
        title="Relatorio de Pedidos"
        subtitle="Filtre por periodo e cliente, visualize os pedidos e baixe em CSV ou PDF."
        onBack={() => router.back()}
      />

      <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
        <FormPanel
          title="Filtros e exportacao"
          subtitle="Ajuste o intervalo, escolha um cliente opcional e baixe o relatorio."
          style={[styles.filtersPanel, isDesktop && styles.filtersPanelDesktop]}>
          <PeriodFilter from={from} to={to} onChangeFrom={setFrom} onChangeTo={setTo} />

          <Text style={styles.fieldLabel}>Cliente</Text>
          <Pressable onPress={() => setOpen(true)} style={styles.select}>
            <Text style={styles.selectText}>{customerLabel}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setCustomerId(null);
              setCustomerName(null);
            }}
            style={styles.clear}>
            <Text style={styles.clearText}>Limpar filtro de cliente</Text>
          </Pressable>

          <ReportExportActions
            onExportCsv={exportOrdersCsv}
            onExportPdf={exportOrdersPdf}
          />
        </FormPanel>

        <FormPanel
          title="Resultado do relatorio"
          subtitle={`Periodo ${periodLabel}.`}
          style={[styles.resultsPanel, isDesktop && styles.resultsPanelDesktop]}>
          <View style={[styles.summaryGrid, isDesktop && styles.summaryGridDesktop]}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pedidos</Text>
              <Text style={styles.summaryValue}>{orders.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{formatMoney(totalAmount)}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : orders.length === 0 ? (
            <Text style={styles.empty}>Nenhum resultado para os filtros atuais.</Text>
          ) : (
            <ScrollView
              style={styles.ordersScroll}
              contentContainerStyle={styles.ordersScrollContent}
              showsVerticalScrollIndicator={isDesktop}>
              {orders.map((order) => (
                <OrderRowCard key={order.id} order={order} compact={isDesktop} />
              ))}
            </ScrollView>
          )}
        </FormPanel>
      </View>

      <Modal
        visible={open}
        transparent={isDesktop}
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalRoot, isDesktop && styles.modalRootDesktop]}>
          {isDesktop ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          ) : null}

          <View style={[styles.modalCard, isDesktop && styles.modalCardDesktop]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Filtrar por cliente</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={styles.close}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {[{ id: 0, name: 'Todos os clientes' } as CustomerRow, ...customers].map(
                (customer) => (
                  <Pressable
                    key={customer.id}
                    style={styles.modalRow}
                    onPress={() => {
                      if (customer.id === 0) {
                        setCustomerId(null);
                        setCustomerName(null);
                      } else {
                        setCustomerId(customer.id);
                        setCustomerName(customer.name);
                      }
                      setOpen(false);
                    }}>
                    <Text style={styles.modalRowText}>{customer.name}</Text>
                  </Pressable>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  layout: {
    gap: theme.space.md,
  },
  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  filtersPanel: {
    width: '100%',
  },
  filtersPanelDesktop: {
    width: 360,
    flexShrink: 0,
  },
  resultsPanel: {
    width: '100%',
  },
  resultsPanelDesktop: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.xs,
    fontWeight: '500',
  },
  select: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 14,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.space.sm,
  },
  selectText: {
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  clear: {
    marginBottom: theme.space.md,
  },
  clearText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  summaryGridDesktop: {
    gap: theme.space.md,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  loadingWrap: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  ordersScroll: {
    maxHeight: 760,
  },
  ordersScrollContent: {
    paddingBottom: theme.space.xs,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  modalRootDesktop: {
    justifyContent: 'center',
    padding: theme.space.lg,
    backgroundColor: theme.colors.overlay,
  },
  modalCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  modalCardDesktop: {
    flex: 0,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    maxHeight: 560,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.space.md,
    paddingTop: theme.space.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  close: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  modalList: {
    padding: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  modalRowText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
