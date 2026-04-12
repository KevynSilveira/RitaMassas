import { PeriodFilter } from '@/components/PeriodFilter';
import { ReportExportActions } from '@/components/reports/ReportExportActions';
import { AppScreen } from '@/components/ui/AppScreen';
import { FormPanel } from '@/components/ui/FormPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import {
  customersWithOrderCount,
  financialSummary,
  listOrdersWithDetails,
  productRankings,
} from '@/lib/database';
import { formatMoney } from '@/lib/format';
import {
  buildPeriodLabel,
  exportCsvReport,
  exportPdfReport,
} from '@/lib/reportExport';
import { ORDER_STATUS_LABELS } from '@/types/models';
import { endOfDay, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

const REPORT_ITEMS = [
  {
    title: 'Pedidos por Periodo',
    desc: 'Lista filtrada por datas e cliente.',
    href: '/relatorios/pedidos' as const,
  },
  {
    title: 'Clientes por Periodo',
    desc: 'Volume de pedidos por cliente no intervalo.',
    href: '/relatorios/clientes' as const,
  },
  {
    title: 'Produtos Mais Pedidos',
    desc: 'Ranking dos itens mais vendidos.',
    href: '/relatorios/produtos' as const,
  },
  {
    title: 'Relatorio Financeiro',
    desc: 'Faturamento, ticket medio e distribuicao por status.',
    href: '/relatorios/financeiro' as const,
  },
] as const;

export default function RelatoriosTabScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [from, setFrom] = useState(() => startOfMonth(new Date()));
  const [to, setTo] = useState(() => endOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [ordersCount, setOrdersCount] = useState(0);
  const [customerRows, setCustomerRows] = useState<
    Awaited<ReturnType<typeof customersWithOrderCount>>
  >([]);
  const [productRows, setProductRows] = useState<
    Awaited<ReturnType<typeof productRankings>>
  >([]);
  const [financeData, setFinanceData] = useState<Awaited<
    ReturnType<typeof financialSummary>
  > | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, customers, products, finance] = await Promise.all([
        listOrdersWithDetails({
          from: from.toISOString(),
          to: to.toISOString(),
        }),
        customersWithOrderCount(from.toISOString(), to.toISOString()),
        productRankings(from.toISOString(), to.toISOString()),
        financialSummary(from.toISOString(), to.toISOString()),
      ]);

      setOrdersCount(orders.length);
      setCustomerRows(customers);
      setProductRows(products);
      setFinanceData(finance);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = buildPeriodLabel(from, to);
  const topProduct = productRows[0];
  const topCustomer = customerRows[0];
  const ticket =
    financeData && financeData.orderCount - financeData.cancelledCount > 0
      ? financeData.totalRevenue / (financeData.orderCount - financeData.cancelledCount)
      : 0;

  const exportOverviewCsv = useCallback(() => {
    exportCsvReport({
      filename: `relatorio-geral-${periodLabel}`,
      columns: ['Bloco', 'Campo', 'Valor'],
      rows: [
        ['Resumo', 'Periodo', periodLabel],
        ['Resumo', 'Pedidos', ordersCount],
        ['Resumo', 'Clientes ativos', customerRows.length],
        ['Resumo', 'Produtos ativos', productRows.length],
        ['Resumo', 'Faturamento', financeData ? formatMoney(financeData.totalRevenue) : ''],
        ['Resumo', 'Ticket medio', formatMoney(ticket)],
        ['Resumo', 'Cliente lider', topCustomer?.name ?? 'Sem dados'],
        ['Resumo', 'Produto lider', topProduct?.name ?? 'Sem dados'],
        ...(financeData
          ? Object.entries(financeData.byStatus).map(([status, count]) => [
              'Status',
              ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status,
              count,
            ])
          : []),
        ...customerRows.slice(0, 5).map((row) => ['Clientes', row.name, row.order_count]),
        ...productRows.slice(0, 5).map((row) => ['Produtos', row.name, row.total_qty]),
      ],
    });
  }, [customerRows, financeData, ordersCount, periodLabel, productRows, ticket, topCustomer, topProduct]);

  const exportOverviewPdf = useCallback(() => {
    exportPdfReport({
      filename: `relatorio-geral-${periodLabel}`,
      title: 'Relatorio Geral do Sistema',
      subtitle: `Periodo: ${periodLabel}`,
      sections: [
        {
          title: 'Resumo',
          rows: [
            `Pedidos no periodo: ${ordersCount}`,
            `Clientes ativos: ${customerRows.length}`,
            `Produtos ativos: ${productRows.length}`,
            `Faturamento: ${financeData ? formatMoney(financeData.totalRevenue) : 'R$ 0,00'}`,
            `Ticket medio: ${formatMoney(ticket)}`,
            `Cliente lider: ${topCustomer?.name ?? 'Sem dados'}`,
            `Produto lider: ${topProduct?.name ?? 'Sem dados'}`,
          ],
        },
        {
          title: 'Status dos pedidos',
          rows: financeData
            ? Object.entries(financeData.byStatus).map(
                ([status, count]) =>
                  `${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}: ${count}`
              )
            : ['Sem dados'],
        },
        {
          title: 'Clientes em destaque',
          rows:
            customerRows.length > 0
              ? customerRows
                  .slice(0, 5)
                  .map((row) => `${row.name}: ${row.order_count} pedido(s)`)
              : ['Sem dados'],
        },
        {
          title: 'Produtos em destaque',
          rows:
            productRows.length > 0
              ? productRows
                  .slice(0, 5)
                  .map((row) => `${row.name}: ${row.total_qty} un.`)
              : ['Sem dados'],
        },
      ],
    });
  }, [customerRows, financeData, ordersCount, periodLabel, productRows, ticket, topCustomer, topProduct]);

  const summaryCards = useMemo(
    () => [
      {
        label: 'Pedidos',
        value: String(ordersCount),
        hint: 'No periodo filtrado',
      },
      {
        label: 'Faturamento',
        value: financeData ? formatMoney(financeData.totalRevenue) : 'R$ 0,00',
        hint: 'Sem pedidos cancelados',
      },
      {
        label: 'Clientes ativos',
        value: String(customerRows.length),
        hint: topCustomer ? `Lider: ${topCustomer.name}` : 'Sem dados',
      },
      {
        label: 'Produtos ativos',
        value: String(productRows.length),
        hint: topProduct ? `Lider: ${topProduct.name}` : 'Sem dados',
      },
      {
        label: 'Entregues',
        value: financeData ? String(financeData.deliveredCount) : '0',
        hint: 'Pedidos concluidos',
      },
      {
        label: 'Ticket medio',
        value: formatMoney(ticket),
        hint: 'Base em pedidos validos',
      },
    ],
    [customerRows.length, financeData, ordersCount, productRows.length, ticket, topCustomer, topProduct]
  );

  return (
    <AppScreen maxWidth={isDesktop ? 1240 : undefined}>
      <PageHeader
        title="Relatorios"
        subtitle="Painel completo com visao geral do sistema e atalhos para os relatorios detalhados."
      />

      <FormPanel
        title="Periodo do relatorio geral"
        subtitle="Ajuste o intervalo e baixe a visao consolidada em CSV ou PDF.">
        <PeriodFilter from={from} to={to} onChangeFrom={setFrom} onChangeTo={setTo} />
        <ReportExportActions
          onExportCsv={exportOverviewCsv}
          onExportPdf={exportOverviewPdf}
        />
      </FormPanel>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <>
          <View style={[styles.summaryGrid, isDesktop && styles.summaryGridDesktop]}>
            {summaryCards.map((card) => (
              <View
                key={card.label}
                style={[styles.summaryCard, isDesktop && styles.summaryCardDesktop]}>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryHint}>{card.hint}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.sectionsGrid, isDesktop && styles.sectionsGridDesktop]}>
            <FormPanel
              title="Status dos pedidos"
              subtitle={`Distribuicao consolidada em ${periodLabel}.`}
              style={[styles.sectionPanel, isDesktop && styles.sectionPanelDesktop]}>
              {financeData ? (
                Object.entries(financeData.byStatus).map(([status, count]) => (
                  <View key={status} style={styles.row}>
                    <Text style={styles.rowLabel}>
                      {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
                    </Text>
                    <Text style={styles.rowValue}>{count}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>Sem dados para o periodo.</Text>
              )}
            </FormPanel>

            <FormPanel
              title="Clientes em destaque"
              subtitle="Clientes com mais pedidos no intervalo atual."
              style={[styles.sectionPanel, isDesktop && styles.sectionPanelDesktop]}>
              {customerRows.slice(0, 5).map((row) => (
                <View key={row.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.name}</Text>
                  <Text style={styles.rowValue}>{row.order_count}</Text>
                </View>
              ))}
              {customerRows.length === 0 ? (
                <Text style={styles.empty}>Sem dados para o periodo.</Text>
              ) : null}
            </FormPanel>

            <FormPanel
              title="Produtos em destaque"
              subtitle="Itens mais vendidos no intervalo atual."
              style={[styles.sectionPanel, isDesktop && styles.sectionPanelDesktop]}>
              {productRows.slice(0, 5).map((row, index) => (
                <View key={row.product_id} style={styles.row}>
                  <Text style={styles.rowLabel}>
                    {index + 1}. {row.name}
                  </Text>
                  <Text style={styles.rowValue}>{row.total_qty}</Text>
                </View>
              ))}
              {productRows.length === 0 ? (
                <Text style={styles.empty}>Sem dados para o periodo.</Text>
              ) : null}
            </FormPanel>

            <FormPanel
              title="Relatorios disponiveis"
              subtitle="Abra o detalhamento certo e baixe os arquivos do tipo adequado."
              style={[styles.sectionPanel, isDesktop && styles.sectionPanelDesktop]}>
              {REPORT_ITEMS.map((item) => (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href)}
                  style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}>
                  <Text style={styles.linkCardTitle}>{item.title}</Text>
                  <Text style={styles.linkCardDesc}>{item.desc}</Text>
                  <PrimaryButton
                    title="Abrir relatorio"
                    onPress={() => router.push(item.href)}
                    variant="outline"
                    style={styles.linkCardButton}
                  />
                </Pressable>
              ))}
            </FormPanel>
          </View>
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.md,
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
    width: '31.9%',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  summaryHint: {
    marginTop: 4,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  sectionsGrid: {
    gap: theme.space.md,
    marginTop: theme.space.md,
  },
  sectionsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sectionPanel: {
    width: '100%',
  },
  sectionPanelDesktop: {
    width: '48.8%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.space.sm,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
  },
  rowValue: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  empty: {
    color: theme.colors.textMuted,
    marginTop: theme.space.sm,
  },
  linkCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
  },
  pressed: {
    opacity: 0.9,
  },
  linkCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  linkCardDesc: {
    marginTop: 4,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  linkCardButton: {
    marginTop: theme.space.sm,
  },
});
