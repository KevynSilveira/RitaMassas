import {
  ActionFeedbackModal,
  type ActionFeedbackButton,
} from '@/components/ui/ActionFeedbackModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { CalendarPickerModal } from '@/components/ui/CalendarPickerModal';
import { Field } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProductThumbnail } from '@/components/ui/ProductThumbnail';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { useSearchModal } from '@/hooks/useSearchModal';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCustomerAddress, formatCustomerPhone } from '@/lib/customerFields';
import { insertOrder, listCustomers, listProducts } from '@/lib/database';
import { formatMoney } from '@/lib/format';
import {
  addProductLine,
  adjustLineQuantity,
  calculateOrderTotal,
  createDefaultDelivery,
  filterCustomers,
  filterProducts,
  removeLine,
  type OrderLine,
  updateLineQuantity,
  validateOrderBeforeSave,
} from '@/lib/orderEditor';
import type { CustomerRow, ProductRow } from '@/types/models';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function NovoPedidoScreen() {
  const router = useRouter();
  const { refresh } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const customerPicker = useSearchModal();
  const productPicker = useSearchModal();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState('');
  const [delivery, setDelivery] = useState(() => createDefaultDelivery());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    primaryAction?: ActionFeedbackButton;
    secondaryAction?: ActionFeedbackButton;
  } | null>(null);

  const closeFeedback = () => setFeedback(null);

  const loadLists = useCallback(async () => {
    const [customerRows, productRows] = await Promise.all([
      listCustomers(),
      listProducts(),
    ]);
    setCustomers(customerRows);
    setProducts(productRows);
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const selectedCustomer = useMemo(
    () => customers.find((item) => item.id === customerId) ?? null,
    [customerId, customers]
  );

  const filteredCustomers = useMemo(() => {
    return filterCustomers(customers, customerPicker.appliedSearch);
  }, [customerPicker.appliedSearch, customers]);

  const filteredProducts = useMemo(() => {
    return filterProducts(products, productPicker.appliedSearch);
  }, [productPicker.appliedSearch, products]);

  const productsById = useMemo(
    () => new Map(products.map((item) => [item.id, item])),
    [products]
  );

  const addProduct = (product: ProductRow) => {
    setLines((prev) => addProductLine(prev, product));
    productPicker.close();
  };

  const updateQty = (index: number, value: string) => {
    setLines((prev) => updateLineQuantity(prev, index, value));
  };

  const adjustQty = (index: number, delta: number) => {
    setLines((prev) => adjustLineQuantity(prev, index, delta));
  };

  const removeItemLine = (index: number) => {
    setLines((prev) => removeLine(prev, index));
  };

  const orderTotal = useMemo(
    () => calculateOrderTotal(lines),
    [lines]
  );

  const deliveryLabel = useMemo(
    () => format(delivery, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    [delivery]
  );

  const deliveryWeekday = useMemo(
    () => format(delivery, 'EEEE', { locale: ptBR }),
    [delivery]
  );

  const deliveryTimeLabel = useMemo(
    () => format(delivery, 'HH:mm', { locale: ptBR }),
    [delivery]
  );

  const resetForm = () => {
    setCustomerId(null);
    setLines([]);
    setNotes('');
    setDelivery(createDefaultDelivery());
    customerPicker.clear();
    productPicker.clear();
  };

  const submit = async () => {
    const validationError = validateOrderBeforeSave(customerId, lines, delivery);
    if (validationError) {
      setFeedback({
        title: validationError.title,
        message: validationError.message,
        secondaryAction: {
          label: 'OK',
        },
      });
      return;
    }

    const selectedCustomerId = customerId;
    if (selectedCustomerId == null) {
      return;
    }

    setSaving(true);
    try {
      const id = await insertOrder(
        selectedCustomerId,
        delivery.toISOString(),
        notes.trim() || null,
        lines
      );
      refresh();
      setFeedback({
        title: 'Pedido criado',
        message: 'O pedido foi salvo e os dados da operacao ja foram atualizados.',
        primaryAction: {
          label: 'Ver pedido',
          onPress: () => router.replace(`/pedido/${id}`),
        },
        secondaryAction: {
          label: 'OK',
          onPress: resetForm,
        },
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Nao foi possivel salvar o pedido.';
      Alert.alert('Erro', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <PageHeader
        title="Novo Pedido"
        subtitle="Selecione o cliente, defina data e horario de entrega e monte os itens do pedido."
      />

      <View style={[styles.topGrid, isDesktop && styles.topGridDesktop]}>
        <View style={[styles.panel, isDesktop && styles.topGridItem]}>
          <Text style={styles.panelTitle}>Cliente</Text>
          <Text style={styles.panelHint}>
            Busque rapido por nome, telefone ou endereco.
          </Text>

          <Pressable
            onPress={customerPicker.open}
            style={({ pressed }) => [
              styles.selectorCard,
              pressed && styles.selectorPressed,
            ]}>
            <Text style={styles.selectorLabel}>Cliente do pedido</Text>
            <Text
              style={
                selectedCustomer ? styles.selectorValue : styles.selectorPlaceholder
              }>
              {selectedCustomer?.name ?? 'Nenhum cliente selecionado'}
            </Text>
            <Text style={styles.selectorMeta}>
              {formatCustomerPhone(selectedCustomer?.phone) ||
                formatCustomerAddress(selectedCustomer?.address) ||
                'Toque para pesquisar e escolher um cliente.'}
            </Text>
          </Pressable>

          <PrimaryButton
            title={selectedCustomer ? 'Trocar cliente' : 'Buscar cliente'}
            onPress={customerPicker.open}
            variant="outline"
            style={styles.inlineButton}
          />
        </View>

        <View style={[styles.panel, isDesktop && styles.topGridItem]}>
          <Text style={styles.panelTitle}>Entrega</Text>
          <Text style={styles.panelHint}>
            Escolha a data e informe o horario da entrega.
          </Text>

          <Pressable
            onPress={() => setCalendarOpen(true)}
            style={({ pressed }) => [
              styles.dateCard,
              pressed && styles.selectorPressed,
            ]}>
            <Text style={styles.selectorLabel}>Data e horario</Text>
            <Text style={styles.dateValue}>{deliveryLabel}</Text>
            <Text style={styles.dateMeta}>
              {deliveryWeekday} as {deliveryTimeLabel}
            </Text>
          </Pressable>

          <PrimaryButton
            title="Escolher data e horario"
            onPress={() => setCalendarOpen(true)}
            variant="outline"
            style={styles.inlineButton}
          />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Observacoes</Text>
        <Text style={styles.panelHint}>
          Informacoes extras para producao, embalagem ou entrega.
        </Text>
        <Field
          label="Observacao do pedido"
          value={notes}
          onChangeText={setNotes}
          placeholder="Opcional"
          multiline
          style={styles.fieldNoMargin}
        />
      </View>

      <View style={styles.panel}>
        <View style={[styles.sectionHead, isDesktop && styles.sectionHeadDesktop]}>
          <View style={styles.sectionHeadText}>
            <Text style={styles.panelTitle}>Itens do pedido</Text>
            <Text style={styles.panelHint}>
              Adicione massas ou produtos e ajuste a quantidade.
            </Text>
          </View>

          <PrimaryButton
            title="+ Adicionar item"
            onPress={productPicker.open}
            variant="outline"
            style={[styles.addItemButton, isDesktop && styles.addItemButtonDesktop]}
          />
        </View>

        {lines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum item adicionado</Text>
            <Text style={styles.emptyText}>
              Use o botao acima para incluir massas ou produtos no pedido.
            </Text>
          </View>
        ) : (
          lines.map((line, index) => {
            const product = productsById.get(line.product_id);
            const subtotal = line.quantity * line.unit_price;

            return (
              <View
                key={`${line.product_id}-${index}`}
                style={[styles.lineCard, isDesktop && styles.lineCardDesktop]}>
                <View style={styles.lineMain}>
                  <ProductThumbnail photoUri={product?.photo_uri} />

                  <View style={styles.lineInfo}>
                    <Text style={styles.lineName}>{product?.name ?? 'Produto'}</Text>
                    <Text style={styles.linePrice}>
                      {formatMoney(line.unit_price)} por unidade
                    </Text>
                  </View>
                </View>

                <View style={[styles.lineMeta, isDesktop && styles.lineMetaDesktop]}>
                  <View style={styles.qtyWrap}>
                    <Text style={styles.metaLabel}>Qtd.</Text>
                    <View style={styles.qtyStepper}>
                      <Pressable
                        onPress={() => adjustQty(index, -1)}
                        style={({ pressed }) => [
                          styles.qtyControl,
                          pressed && styles.qtyControlPressed,
                        ]}>
                        <Text style={styles.qtyControlText}>-</Text>
                      </Pressable>

                      <TextInput
                        style={styles.qty}
                        keyboardType="decimal-pad"
                        value={String(line.quantity)}
                        onChangeText={(text) => updateQty(index, text)}
                      />

                      <Pressable
                        onPress={() => adjustQty(index, 1)}
                        style={({ pressed }) => [
                          styles.qtyControl,
                          pressed && styles.qtyControlPressed,
                        ]}>
                        <Text style={styles.qtyControlText}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.subtotalWrap}>
                    <Text style={styles.metaLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>{formatMoney(subtotal)}</Text>
                  </View>

                  <Pressable
                    onPress={() => removeItemLine(index)}
                    style={({ pressed }) => [
                      styles.removeButton,
                      pressed && styles.removeButtonPressed,
                    ]}>
                    <Text style={styles.removeButtonText}>Remover</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.footerCard, isDesktop && styles.footerCardDesktop]}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Resumo do pedido</Text>
          <Text style={styles.totalMeta}>
            {lines.length} item(ns) selecionado(s)
          </Text>
          <Text style={styles.totalValue}>{formatMoney(orderTotal)}</Text>
        </View>

        <PrimaryButton
          title="Salvar pedido"
          onPress={submit}
          loading={saving}
          style={[styles.saveButton, isDesktop && styles.saveButtonDesktop]}
        />
      </View>

      <CalendarPickerModal
        visible={calendarOpen}
        title="Selecionar entrega"
        value={delivery}
        onClose={() => setCalendarOpen(false)}
        onConfirm={(date) => {
          setDelivery(date);
          setCalendarOpen(false);
        }}
      />

      <Modal
        visible={customerPicker.visible}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={customerPicker.close}>
        <View style={[styles.modalRoot, isDesktop && styles.modalRootDesktop]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={customerPicker.close}
          />

          <View style={[styles.modalCard, isDesktop && styles.modalCardDesktop]}>
            <View style={styles.modalHead}>
              <View style={styles.modalHeadText}>
                <Text style={styles.modalTitle}>Selecionar cliente</Text>
                <Text style={styles.modalSubtitle}>
                  Pesquise rapido e toque no cliente para usar no pedido.
                </Text>
              </View>
              <Pressable onPress={customerPicker.close}>
                <Text style={styles.close}>Fechar</Text>
              </Pressable>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.searchRow}>
                <TextInput
                  value={customerPicker.search}
                  onChangeText={customerPicker.setSearch}
                  onSubmitEditing={customerPicker.apply}
                  placeholder="Nome, telefone ou endereco"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.searchInput}
                />
                <PrimaryButton
                  title="Pesquisar"
                  onPress={customerPicker.apply}
                  variant="outline"
                  style={styles.searchButton}
                />
              </View>

              {customerPicker.hasAppliedSearch ? (
                <Pressable
                  onPress={customerPicker.clear}
                  style={styles.clearSearch}>
                  <Text style={styles.clearSearchText}>Limpar busca</Text>
                </Pressable>
              ) : null}

              <FlatList
                style={styles.modalListView}
                data={filteredCustomers}
                keyExtractor={(customer) => String(customer.id)}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.listCard}
                    onPress={() => {
                      setCustomerId(item.id);
                      customerPicker.close();
                    }}>
                    <Text style={styles.listRowText}>{item.name}</Text>
                    {formatCustomerPhone(item.phone) ? (
                      <Text style={styles.listRowSub}>
                        {formatCustomerPhone(item.phone)}
                      </Text>
                    ) : null}
                    {formatCustomerAddress(item.address) ? (
                      <Text style={styles.listRowHint} numberOfLines={2}>
                        {formatCustomerAddress(item.address)}
                      </Text>
                    ) : null}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>
                    Nenhum cliente encontrado. Cadastre em Cadastrar &gt; Clientes.
                  </Text>
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={productPicker.visible}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={productPicker.close}>
        <View style={[styles.modalRoot, isDesktop && styles.modalRootDesktop]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={productPicker.close}
          />

          <View style={[styles.modalCard, isDesktop && styles.modalCardDesktop]}>
            <View style={styles.modalHead}>
              <View style={styles.modalHeadText}>
                <Text style={styles.modalTitle}>Massas e produtos</Text>
                <Text style={styles.modalSubtitle}>
                  Busque um item e toque para incluir no pedido.
                </Text>
              </View>
              <Pressable onPress={productPicker.close}>
                <Text style={styles.close}>Fechar</Text>
              </Pressable>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.searchRow}>
                <TextInput
                  value={productPicker.search}
                  onChangeText={productPicker.setSearch}
                  onSubmitEditing={productPicker.apply}
                  placeholder="Pesquisar massa ou produto"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.searchInput}
                />
                <PrimaryButton
                  title="Pesquisar"
                  onPress={productPicker.apply}
                  variant="outline"
                  style={styles.searchButton}
                />
              </View>

              {productPicker.hasAppliedSearch ? (
                <Pressable
                  onPress={productPicker.clear}
                  style={styles.clearSearch}>
                  <Text style={styles.clearSearchText}>Limpar busca</Text>
                </Pressable>
              ) : null}

              <FlatList
                style={styles.modalListView}
                data={filteredProducts}
                keyExtractor={(product) => String(product.id)}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable style={styles.listCard} onPress={() => addProduct(item)}>
                    <View style={styles.listCardRow}>
                      <ProductThumbnail photoUri={item.photo_uri} size={46} />

                      <View style={styles.listCardText}>
                        <Text style={styles.listRowText}>{item.name}</Text>
                        <Text style={styles.listRowSub}>{formatMoney(item.price)}</Text>
                        {item.recipe ? (
                          <Text style={styles.listRowHint} numberOfLines={2}>
                            {item.recipe}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>
                    Nenhum produto encontrado. Cadastre em Cadastrar &gt; Massas e
                    produtos.
                  </Text>
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      <ActionFeedbackModal
        visible={feedback != null}
        title={feedback?.title ?? ''}
        message={feedback?.message ?? ''}
        onClose={closeFeedback}
        primaryAction={feedback?.primaryAction}
        secondaryAction={feedback?.secondaryAction}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topGrid: {
    gap: theme.space.md,
  },
  topGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  topGridItem: {
    flex: 1,
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
    marginBottom: theme.space.md,
  },
  panelTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  panelHint: {
    marginTop: 4,
    marginBottom: theme.space.md,
    color: theme.colors.textMuted,
    fontSize: theme.font.caption,
    lineHeight: 18,
  },
  selectorCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
  },
  selectorPressed: {
    opacity: 0.92,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectorValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  selectorPlaceholder: {
    marginTop: 6,
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  selectorMeta: {
    marginTop: 6,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  dateCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
  },
  dateValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  dateMeta: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  inlineButton: {
    marginTop: theme.space.md,
  },
  fieldNoMargin: {
    marginBottom: 0,
  },
  sectionHead: {
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  sectionHeadDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionHeadText: {
    flex: 1,
    minWidth: 0,
  },
  addItemButton: {
    width: '100%',
  },
  addItemButtonDesktop: {
    width: 220,
  },
  emptyCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    padding: theme.space.lg,
    backgroundColor: theme.colors.background,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  lineCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
    gap: theme.space.md,
  },
  lineCardDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    minWidth: 0,
  },
  lineInfo: {
    flex: 1,
    minWidth: 0,
  },
  lineName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  linePrice: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  lineMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    alignItems: 'flex-end',
  },
  lineMetaDesktop: {
    justifyContent: 'flex-end',
  },
  qtyWrap: {
    minWidth: 84,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  qty: {
    flex: 1,
    height: 48,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.text,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  qtyControl: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  qtyControlPressed: {
    opacity: 0.78,
  },
  qtyControlText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    lineHeight: 24,
  },
  subtotalWrap: {
    minWidth: 120,
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  removeButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#D6A19D',
    backgroundColor: '#FFF7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonPressed: {
    opacity: 0.88,
  },
  removeButtonText: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  footerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  footerCardDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalWrap: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalMeta: {
    marginTop: 6,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  saveButton: {
    width: '100%',
  },
  saveButtonDesktop: {
    width: 240,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: theme.space.xl,
    backgroundColor: theme.colors.overlay,
  },
  modalRootDesktop: {
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  modalCardDesktop: {
    alignSelf: 'center',
    maxWidth: 640,
    borderRadius: theme.radius.lg,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.space.md,
    padding: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalHeadText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  close: {
    color: theme.colors.primary,
    fontWeight: '700',
    paddingTop: 2,
  },
  modalContent: {
    flex: 1,
    padding: theme.space.md,
    paddingBottom: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space.md,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  searchButton: {
    width: 132,
  },
  clearSearch: {
    alignSelf: 'flex-start',
    marginTop: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  clearSearchText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.font.caption,
  },
  modalList: {
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  modalListView: {
    flex: 1,
  },
  listCard: {
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    marginBottom: theme.space.sm,
  },
  listCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  listCardText: {
    flex: 1,
    minWidth: 0,
  },
  listRowText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  listRowSub: {
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  listRowHint: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  emptyModalText: {
    color: theme.colors.textMuted,
    marginTop: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  successOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.md,
    backgroundColor: theme.colors.overlay,
  },
  successCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  successText: {
    marginTop: theme.space.sm,
    marginBottom: theme.space.lg,
    fontSize: theme.font.body,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  successActions: {
    flexDirection: 'row',
    gap: theme.space.sm,
  },
  successSecondaryButton: {
    flex: 1,
  },
  successPrimaryButton: {
    flex: 1.4,
  },
});
