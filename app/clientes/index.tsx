import { useFocusEffect } from '@react-navigation/native';
import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { listCustomers } from '@/lib/database';
import { formatCustomerAddress, formatCustomerPhone } from '@/lib/customerFields';
import { filterCustomers } from '@/lib/orderEditor';
import type { CustomerRow } from '@/types/models';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ClientesIndexScreen() {
  const router = useRouter();
  const { tick } = useDataRefresh();
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listCustomers());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, tick])
  );

  const filteredItems = useMemo(() => filterCustomers(items, search), [items, search]);

  return (
    <AppScreen scroll={false}>
      <PageHeader
        title="Clientes"
        subtitle="Cadastre, consulte e edite os clientes em um unico lugar."
        action={
          <PrimaryButton
            title="+ Novo Cliente"
            onPress={() => router.push('/clientes/novo')}
          />
        }
      />

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar cliente por nome, telefone ou endereco"
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
              onPress={() => router.push(`/clientes/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.cardText}>
                <Text style={styles.name}>{item.name}</Text>
                {formatCustomerPhone(item.phone) ? (
                  <Text style={styles.sub}>{formatCustomerPhone(item.phone)}</Text>
                ) : null}
                {formatCustomerAddress(item.address) ? (
                  <Text style={styles.addr} numberOfLines={2}>
                    {formatCustomerAddress(item.address)}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chev}>{'>'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search.trim()
                ? 'Nenhum cliente encontrado para essa busca.'
                : 'Nenhum cliente cadastrado.'}
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
  },
  cardText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sub: {
    marginTop: 4,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  addr: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textMuted,
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
