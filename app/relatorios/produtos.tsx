import { PeriodFilter } from '@/components/PeriodFilter';
import { ReportExportActions } from '@/components/reports/ReportExportActions';
import { AppScreen } from '@/components/ui/AppScreen';
import { FormPanel } from '@/components/ui/FormPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { productRankings } from '@/lib/database';
import {
  buildPeriodLabel,
  exportCsvReport,
  exportPdfReport,
} from '@/lib/reportExport';
import { endOfDay, startOfMonth } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function RelatorioProdutosScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [from, setFrom] = useState(() => startOfMonth(new Date()));
  const [to, setTo] = useState(() => endOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof productRankings>>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await productRankings(from.toISOString(), to.toISOString()));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = buildPeriodLabel(from, to);

  const exportProductsCsv = useCallback(() => {
    exportCsvReport({
      filename: `relatorio-produtos-${periodLabel}`,
      columns: ['Posicao', 'Produto', 'Quantidade'],
      rows: rows.map((row, index) => [index + 1, row.name, row.total_qty]),
    });
  }, [periodLabel, rows]);

  const exportProductsPdf = useCallback(() => {
    exportPdfReport({
      filename: `relatorio-produtos-${periodLabel}`,
      title: 'Relatorio de Produtos',
      subtitle: `Periodo: ${periodLabel}`,
      sections: [
        {
          title: 'Resumo',
          rows: [
            `Produtos com vendas: ${rows.length}`,
            `Produto lider: ${rows[0]?.name ?? 'Sem dados'}`,
          ],
        },
        {
          title: 'Ranking',
          rows:
            rows.length > 0
              ? rows.map((row, index) => `${index + 1}. ${row.name}: ${row.total_qty} un.`)
              : ['Nenhum dado encontrado para o periodo atual.'],
        },
      ],
    });
  }, [periodLabel, rows]);

  return (
    <AppScreen maxWidth={isDesktop ? 1120 : undefined}>
      <PageHeader
        title="Relatorio de Produtos"
        subtitle="Veja o ranking de vendas por item e baixe o resultado em CSV ou PDF."
        onBack={() => router.back()}
      />

      <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
        <FormPanel
          title="Filtros e exportacao"
          subtitle="Ajuste o periodo para atualizar o ranking dos produtos."
          style={[styles.filtersPanel, isDesktop && styles.filtersPanelDesktop]}>
          <PeriodFilter from={from} to={to} onChangeFrom={setFrom} onChangeTo={setTo} />
          <ReportExportActions
            onExportCsv={exportProductsCsv}
            onExportPdf={exportProductsPdf}
          />
        </FormPanel>

        <FormPanel
          title="Produtos mais pedidos"
          subtitle={`Ranking consolidado entre ${periodLabel}.`}
          style={[styles.resultsPanel, isDesktop && styles.resultsPanelDesktop]}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>Nenhum dado no periodo.</Text>
          ) : (
            rows.map((row, index) => (
              <View key={row.product_id} style={styles.row}>
                <Text style={styles.rank}>{index + 1}.</Text>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.name}</Text>
                  <Text style={styles.rowHint}>{row.total_qty} un. vendidas</Text>
                </View>
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
    gap: theme.space.sm,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rank: {
    width: 28,
    fontWeight: '800',
    color: theme.colors.accent,
    fontSize: 16,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  empty: {
    color: theme.colors.textMuted,
    marginTop: theme.space.sm,
  },
});
