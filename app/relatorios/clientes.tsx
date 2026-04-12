import { PeriodFilter } from '@/components/PeriodFilter';
import { ReportExportActions } from '@/components/reports/ReportExportActions';
import { AppScreen } from '@/components/ui/AppScreen';
import { FormPanel } from '@/components/ui/FormPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { customersWithOrderCount } from '@/lib/database';
import {
  buildPeriodLabel,
  exportCsvReport,
  exportPdfReport,
} from '@/lib/reportExport';
import { endOfDay, startOfMonth } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function RelatorioClientesScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [from, setFrom] = useState(() => startOfMonth(new Date()));
  const [to, setTo] = useState(() => endOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof customersWithOrderCount>>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await customersWithOrderCount(from.toISOString(), to.toISOString()));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = buildPeriodLabel(from, to);

  const exportCustomersCsv = useCallback(() => {
    exportCsvReport({
      filename: `relatorio-clientes-${periodLabel}`,
      columns: ['Cliente', 'Pedidos'],
      rows: rows.map((row) => [row.name, row.order_count]),
    });
  }, [periodLabel, rows]);

  const exportCustomersPdf = useCallback(() => {
    exportPdfReport({
      filename: `relatorio-clientes-${periodLabel}`,
      title: 'Relatorio de Clientes',
      subtitle: `Periodo: ${periodLabel}`,
      sections: [
        {
          title: 'Resumo',
          rows: [
            `Clientes com pedidos: ${rows.length}`,
            `Cliente lider: ${rows[0]?.name ?? 'Sem dados'}`,
          ],
        },
        {
          title: 'Clientes',
          rows:
            rows.length > 0
              ? rows.map((row) => `${row.name}: ${row.order_count} pedido(s)`)
              : ['Nenhum dado encontrado para o periodo atual.'],
        },
      ],
    });
  }, [periodLabel, rows]);

  return (
    <AppScreen maxWidth={isDesktop ? 1120 : undefined}>
      <PageHeader
        title="Relatorio de Clientes"
        subtitle="Acompanhe os clientes com mais pedidos e baixe o resultado em CSV ou PDF."
        onBack={() => router.back()}
      />

      <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
        <FormPanel
          title="Filtros e exportacao"
          subtitle="Selecione o periodo para recalcular o ranking de clientes."
          style={[styles.filtersPanel, isDesktop && styles.filtersPanelDesktop]}>
          <PeriodFilter from={from} to={to} onChangeFrom={setFrom} onChangeTo={setTo} />
          <ReportExportActions
            onExportCsv={exportCustomersCsv}
            onExportPdf={exportCustomersPdf}
          />
        </FormPanel>

        <FormPanel
          title="Clientes por periodo"
          subtitle={`Clientes com pelo menos um pedido entre ${periodLabel}.`}
          style={[styles.resultsPanel, isDesktop && styles.resultsPanelDesktop]}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>Nenhum dado no periodo.</Text>
          ) : (
            rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <Text style={styles.rowLabel}>{row.name}</Text>
                <Text style={styles.rowValue}>{row.order_count} pedido(s)</Text>
              </View>
            ))
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
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.space.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  rowValue: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  empty: {
    color: theme.colors.textMuted,
    marginTop: theme.space.sm,
  },
});
