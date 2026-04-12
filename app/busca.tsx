import { useFocusEffect } from '@react-navigation/native';
import { OrderRowCard } from '@/components/OrderRowCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCustomerAddress, formatCustomerPhone } from '@/lib/customerFields';
import { listCustomers, listOrdersWithDetails, listProducts } from '@/lib/database';
import { formatMoney } from '@/lib/format';
import {
  hasSearchQuery,
  searchCustomers,
  searchNavigationShortcuts,
  searchOrders,
  searchProducts,
} from '@/lib/globalSearch';
import type { CustomerRow, OrderWithDetails, ProductRow } from '@/types/models';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function BuscaScreen() {
  const router = useRouter();
  const { tick } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCustomers, nextProducts, nextOrders] = await Promise.all([
        listCustomers(),
        listProducts(),
        listOrdersWithDetails(),
      ]);

      setCustomers(nextCustomers);
      setProducts(nextProducts);
      setOrders(nextOrders);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, tick])
  );

  const hasQuery = hasSearchQuery(query);

  const shortcutResults = useMemo(
    () => (hasQuery ? searchNavigationShortcuts(query) : []),
    [hasQuery, query]
  );
  const customerResults = useMemo(
    () => (hasQuery ? searchCustomers(query, customers) : []),
    [customers, hasQuery, query]
  );
  const productResults = useMemo(
    () => (hasQuery ? searchProducts(query, products) : []),
    [hasQuery, products, query]
  );
  const orderResults = useMemo(
    () => (hasQuery ? searchOrders(query, orders) : []),
    [hasQuery, orders, query]
  );

  const totalResults =
    shortcutResults.length +
    customerResults.length +
    productResults.length +
    orderResults.length;

  const detailColumnCount =
    Number(customerResults.length > 0) + Number(productResults.length > 0);

  return (
    <AppScreen maxWidth={1120}>
      <PageHeader title="Busca" subtitle="Atalhos e registros." />

      <View style={styles.searchShell}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar menu, cliente, massa, produto ou pedido"
          autoFocus
        />
        {hasQuery && !loading ? (
          <Text style={styles.searchMeta}>
            {totalResults} resultado{totalResults === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>

      {!hasQuery ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Digite para buscar</Text>
        </View>
      ) : loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>Buscando...</Text>
        </View>
      ) : totalResults === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Nenhum resultado</Text>
        </View>
      ) : (
        <>
          {shortcutResults.length > 0 ? (
            <View style={styles.sectionPanel}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Atalhos</Text>
                <Text style={styles.sectionCount}>{shortcutResults.length}</Text>
              </View>

              <View
                style={[
                  styles.shortcutGrid,
                  isDesktop && styles.shortcutGridDesktop,
                ]}>
                {shortcutResults.map((shortcut) => (
                  <Pressable
                    key={shortcut.key}
                    onPress={() => router.push(shortcut.href)}
                    style={({ pressed }) => [
                      styles.shortcutCard,
                      isDesktop && styles.shortcutCardDesktop,
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.shortcutIcon}>
                      <FontAwesome
                        name={shortcut.icon}
                        size={18}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.resultsGrid, isDesktop && styles.resultsGridDesktop]}>
            {orderResults.length > 0 ? (
              <View style={[styles.sectionPanel, isDesktop && styles.fullPanel]}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Pedidos</Text>
                  <Text style={styles.sectionCount}>{orderResults.length}</Text>
                </View>

                <View style={styles.resultList}>
                  {orderResults.map((order) => (
                    <OrderRowCard key={order.id} order={order} compact />
                  ))}
                </View>
              </View>
            ) : null}

            {customerResults.length > 0 ? (
              <View
                style={[
                  styles.sectionPanel,
                  isDesktop && detailColumnCount > 1 ? styles.halfPanel : styles.fullPanel,
                ]}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Clientes</Text>
                  <Text style={styles.sectionCount}>{customerResults.length}</Text>
                </View>

                <View style={styles.resultList}>
                  {customerResults.map((customer) => (
                    <Pressable
                      key={customer.id}
                      onPress={() => router.push(`/clientes/${customer.id}`)}
                      style={({ pressed }) => [
                        styles.dataCard,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.dataTitle}>{customer.name}</Text>
                      {formatCustomerPhone(customer.phone) ? (
                        <Text style={styles.dataPrimary}>
                          {formatCustomerPhone(customer.phone)}
                        </Text>
                      ) : null}
                      {formatCustomerAddress(customer.address) ? (
                        <Text style={styles.dataSecondary} numberOfLines={2}>
                          {formatCustomerAddress(customer.address)}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {productResults.length > 0 ? (
              <View
                style={[
                  styles.sectionPanel,
                  isDesktop && detailColumnCount > 1 ? styles.halfPanel : styles.fullPanel,
                ]}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Massas e produtos</Text>
                  <Text style={styles.sectionCount}>{productResults.length}</Text>
                </View>

                <View style={styles.resultList}>
                  {productResults.map((product) => (
                    <Pressable
                      key={product.id}
                      onPress={() => router.push(`/produtos/${product.id}`)}
                      style={({ pressed }) => [
                        styles.dataCard,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.dataTitle}>{product.name}</Text>
                      <Text style={styles.dataPrimary}>{formatMoney(product.price)}</Text>
                      {product.recipe ? (
                        <Text style={styles.dataSecondary} numberOfLines={2}>
                          {product.recipe}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchShell: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
  },
  searchMeta: {
    marginTop: theme.space.sm,
    fontSize: theme.font.caption,
    textAlign: 'right',
    color: theme.colors.textMuted,
  },
  stateCard: {
    marginTop: theme.space.md,
    minHeight: 120,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  stateText: {
    marginTop: theme.space.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  sectionPanel: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.md,
  },
  sectionTitle: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  sectionCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    textAlign: 'center',
    fontSize: theme.font.small,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  shortcutGridDesktop: {
    gap: theme.space.md,
  },
  shortcutCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.space.md,
    paddingVertical: 14,
  },
  shortcutCardDesktop: {
    width: '31.9%',
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shortcutTitle: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  resultsGrid: {
    marginTop: theme.space.md,
    gap: theme.space.md,
  },
  resultsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  fullPanel: {
    width: '100%',
  },
  halfPanel: {
    width: '48.7%',
  },
  resultList: {
    gap: theme.space.sm,
  },
  dataCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
  },
  dataTitle: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  dataPrimary: {
    marginTop: 4,
    fontSize: theme.font.caption,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  dataSecondary: {
    marginTop: 4,
    fontSize: theme.font.caption,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  pressed: {
    opacity: 0.9,
  },
});

