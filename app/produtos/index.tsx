import { useFocusEffect } from '@react-navigation/native';
import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { listProducts } from '@/lib/database';
import { formatMoney } from '@/lib/format';
import { filterProducts } from '@/lib/orderEditor';
import { resolveProductPhotoUri } from '@/lib/product-photo';
import type { ProductRow } from '@/types/models';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ProdutosIndexScreen() {
  const router = useRouter();
  const { tick } = useDataRefresh();
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, tick])
  );

  const filteredItems = useMemo(() => filterProducts(items, search), [items, search]);

  return (
    <AppScreen scroll={false}>
      <PageHeader
        title="Massas e Produtos"
        subtitle="Organize o catalogo, fotos, receitas e valores de venda."
        action={
          <PrimaryButton
            title="+ Nova Massa"
            onPress={() => router.push('/produtos/novo')}
          />
        }
      />

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar massa ou produto pelo nome"
        style={styles.search}
      />

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/produtos/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              {item.photo_uri ? (
                <Image
                  source={{
                    uri: resolveProductPhotoUri(item.photo_uri) ?? item.photo_uri,
                  }}
                  style={styles.thumb}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]}>
                  <Text style={styles.thumbPhText}>?</Text>
                </View>
              )}

              <View style={styles.cardText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>{formatMoney(item.price)}</Text>
              </View>

              <Text style={styles.chev}>{'>'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search.trim()
                ? 'Nenhuma massa ou produto encontrado para essa busca.'
                : 'Nenhuma massa cadastrada.'}
            </Text>
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  search: {
    marginBottom: theme.space.md,
  },
  listContent: {
    paddingBottom: 48,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.space.md,
  },
  cardText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
  },
  thumbPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPhText: {
    color: theme.colors.textMuted,
    fontWeight: '800',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  price: {
    marginTop: 4,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  chev: {
    fontSize: 22,
    color: theme.colors.textMuted,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: 24,
  },
});
