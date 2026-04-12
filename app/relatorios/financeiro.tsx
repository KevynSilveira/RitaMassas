import { PeriodFilter } from '@/components/PeriodFilter';
import { ReportExportActions } from '@/components/reports/ReportExportActions';
import { AppScreen } from '@/components/ui/AppScreen';
import { FormPanel } from '@/components/ui/FormPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { financialSummary } from '@/lib/database';
import { formatMoney } from '@/lib/format';
import {
  buildPeriodLabel,
  exportCsvReport,
  exportPdfReport,
} from '@/lib/reportExport';
import { ORDER_STATUS_LABELS } from '@/types/models';
import { endOfDay, startOfMonth } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function RelatorioFinanceiroScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [from, setFrom] = useState(() => startOfMonth(new Date()));
  const [to, setTo] = useState(() => endOfDay(new Date()));
  const [data, setData] = useState<Awaited<
    ReturnType<typeof financialSummary>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await financialSummary(from.toISOString(), to.toISOString()));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = buildPeriodLabel(from, to);
  const ticket = useMemo(() => {
    if (!data) {
      return 0;
    }

    return data.orderCount - data.cancelledCount > 0
      ? data.totalRevenue / (data.orderCount - data.cancelledCount)
      : 0;
  }, [data]);

  const exportFinanceCsv = useCallback(() => {
    if (!data) {
      return;
    }

    exportCsvReport({
      filename: `relatorio-financeiro-${periodLabel}`,
      columns: ['Bloco', 'Campo', 'Valor'],
      rows: [
        ['Resumo', 'Pedidos', data.orderCount],
        ['Resumo', 'Cancelados', data.cancelledCount],
        ['Resumo', 'Entregues', data.deliveredCount],
        ['Resumo', 'Faturamento', formatMoney(data.totalRevenue)],
        ['Resumo', 'Ticket medio', formatMoney(ticket)],
        ...Object.entries(data.byStatus).map(([status, count]) => [
          'Status',
          ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status,
          count,
        ]),
      ],
    });
  }, [data, periodLabel, ticket]);

  const exportFinancePdf = useCallback(() => {
    if (!data) {
      return;
    }

    exportPdfReport({
      filename: `relatorio-financeiro-${periodLabel}`,
      title: 'Relatorio Financeiro',
      subtitle: `Periodo: ${periodLabel}`,
      sections: [
        {
          title: 'Resumo',
          rows: [
            `Pedidos: ${data.orderCount}`,
            `Cancelados: ${data.cancelledCount}`,
            `Entregues: ${data.deliveredCount}`,
            `Faturamento: ${formatMoney(data.totalRevenue)}`,
            `Ticket medio: ${formatMoney(ticket)}`,
          ],
        },
        {
          title: 'Pedidos por status',
          rows: Object.entries(data.byStatus).map(
            ([status, count]) =>
              `${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}: ${count}`
          ),
        },
      ],
    });
  }, [data, periodLabel, ticket]);

  return (
    <AppScreen maxWidth={isDesktop ? 1180 : undefined}>
      <PageHeader
        title="Relatorio Financeiro"
        subtitle="Analise faturamento, ticket medio e distribuicao dos pedidos por status."
        onBack={() => router.back()}
      />

      <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
        <FormPanel
          title="Filtros e exportacao"
          subtitle="Selecione o periodo e baixe o resumo financeiro em CSV ou PDF."
          style={[styles.filtersPanel, isDesktop && styles.filtersPanelDesktop]}>
          <PeriodFilter from={from} to={to} onChangeFrom={setFrom} onChangeTo={setTo} />
          <ReportExportActions
            onExportCsv={exportFinanceCsv}
            onExportPdf={exportFinancePdf}
          />
        </FormPanel>

        <FormPanel
          title="Resumo financeiro"
          subtitle={`Consolidado entre ${periodLabel}.`}
          style={[styles.resultsPanel, isDesktop && styles.resultsPanelDesktop]}>
          {loading || !data ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <View style={[styles.cardsGrid, isDesktop && styles.cardsGridDesktop]}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Pedidos</Text>
                  <Text style={styles.cardValue}>{data.orderCount}</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Cancelados</Text>
                  <Text style={styles.cardValue}>{data.cancelledCount}</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Entregues</Text>
                  <Text style={styles.cardValue}>{data.deliveredCount}</Text>
                </View>
                <View style={styles.cardHighlight}>
                  <Text style={styles.cardHighlightLabel}>Faturamento</Text>
                  <Text style={styles.cardHighlightValue}>
                    {formatMoney(data.totalRevenue)}
                  </Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Ticket medio</Text>
                  <Text style={styles.cardValue}>{formatMoney(ticket)}</Text>
                </View>
              </View>

              <Text style={styles.subTitle}>Pedidos por status</Text>
              {Object.entries(data.byStatus).map(([status, count]) => (
                <View key={status} style={styles.row}>
                  <Text style={styles.rowLabel}>
                    {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
                  </Text>
                  <Text style={styles.rowValue}>{count}</Text>
                </View>
              ))}
            </>
          )}
        </FormPanel>
      </View>
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
    width: 340,
    flexShrink: 0,
  },
  resultsPanel: {
    width: '100%',
  },
  resultsPanelDesktop: {
    flex: 1,
    minWidth: 0,
  },
  loadingWrap: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  cardsGridDesktop: {
    gap: theme.space.md,
  },
  card: {
    width: '48.4%',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  cardValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  cardHighlight: {
    width: '100%',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryDark,
    padding: theme.space.md,
  },
  cardHighlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E8DED4',
    textTransform: 'uppercase',
  },
  cardHighlightValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFBF7',
  },
  subTitle: {
    marginTop: theme.space.lg,
    marginBottom: theme.space.sm,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
