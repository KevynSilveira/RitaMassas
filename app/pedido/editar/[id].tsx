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
import {
  getOrderWithDetails,
  listOrderItems,
  listProducts,
  updateOrderItems,
  updateOrderMeta,
} from '@/lib/database';
import { formatDateTime, formatMoney } from '@/lib/format';
import {
  addProductLine,
  adjustLineQuantity,
  calculateOrderTotal,
  createDefaultDelivery,
  filterProducts,
  removeLine,
  type OrderLine,
  updateLineQuantity,
  validateOrderBeforeSave,
} from '@/lib/orderEditor';
import { getOrderStatusTone } from '@/lib/orderStatusTone';
import type { OrderStatus, ProductRow } from '@/types/models';
import { ORDER_STATUS_LABELS } from '@/types/models';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function EditarPedidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const productPicker = useSearchModal();
  const orderId = Number(id);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [order, setOrder] = useState<Awaited<
    ReturnType<typeof getOrderWithDetails>
  > | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState('');
  const [delivery, setDelivery] = useState(() => createDefaultDelivery());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    primaryAction?: ActionFeedbackButton;
    secondaryAction?: ActionFeedbackButton;
  } | null>(null);

  const closeFeedback = () => setFeedback(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId)) {
      setMissing(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [productRows, nextOrder, orderItems] = await Promise.all([
        listProducts(),
        getOrderWithDetails(orderId),
        listOrderItems(orderId),
      ]);

      setProducts(productRows);

      if (!nextOrder) {
        setOrder(null);
        setMissing(true);
        return;
      }

      setOrder(nextOrder);
      setMissing(false);
      setNotes(nextOrder.notes ?? '');
      setDelivery(new Date(nextOrder.delivery_at));
      setLines(orderItems);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    return filterProducts(products, productPicker.appliedSearch);
  }, [productPicker.appliedSearch, products]);

  const productsById = useMemo(
    () => new Map(products.map((item) => [item.id, item])),
    [products]
  );

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

  const updateQty = (index: number, value: string) => {
    setLines((prev) => updateLineQuantity(prev, index, value));
  };

  const adjustQty = (index: number, delta: number) => {
    setLines((prev) => adjustLineQuantity(prev, index, delta));
  };

  const removeItemLine = (index: number) => {
    if (lines.length === 1) {
      Alert.alert(
        'Itens',
        'O pedido precisa manter pelo menos um produto. Adicione outro item antes de remover este.'
      );
      return;
    }

    setLines((prev) => removeLine(prev, index));
  };

  const submit = async () => {
    if (!order) {
      return;
    }

    const validationError = validateOrderBeforeSave(order.customer_id, lines, delivery);
    if (validationError) {
      Alert.alert(validationError.title, validationError.message);
      return;
    }

    setSaving(true);
    try {
      await updateOrderMeta(orderId, {
        delivery_at: delivery.toISOString(),
        notes: notes.trim() || null,
      });
      await updateOrderItems(orderId, lines);
      refresh();
      setFeedback({
        title: 'Pedido atualizado',
        message: 'As alteracoes do pedido foram salvas com sucesso.',
        primaryAction: {
          label: 'Ver pedido',
          onPress: () => router.replace(`/pedido/${orderId}`),
        },
        secondaryAction: {
          label: 'OK',
        },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Nao foi possivel salvar as alteracoes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <PageHeader
          title="Editar Pedido"
          subtitle="Carregando os dados para edicao."
          onBack={() => router.back()}
        />
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>Carregando pedido...</Text>
        </View>
      </AppScreen>
    );
  }

  if (missing || !order) {
    return (
      <AppScreen>
        <PageHeader
          title="Editar Pedido"
          subtitle="Nao foi possivel localizar esse pedido."
          onBack={() => router.back()}
        />
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Pedido nao encontrado</Text>
          <Text style={styles.feedbackText}>
            Volte para a lista de pedidos e abra um registro valido.
          </Text>
          <PrimaryButton
            title="Voltar para pedidos"
            onPress={() => router.replace('/(tabs)/pedidos')}
            style={styles.feedbackAction}
          />
        </View>
      </AppScreen>
    );
  }

  const statusTone = getOrderStatusTone(order.status);

  return (
    <AppScreen>
      <PageHeader
        title="Editar Pedido"
        subtitle="Atualize entrega, observacoes e itens do pedido."
        onBack={() => router.back()}
        action={
          <PrimaryButton
            title="Ver pedido"
            onPress={() => router.replace(`/pedido/${order.id}`)}
            variant="outline"
          />
        }
      />

      <View style={styles.summaryBar}>
        <View style={styles.summaryText}>
          <Text style={styles.summaryEyebrow}>Pedido #{order.id}</Text>
          <Text style={styles.summaryMeta}>
            Ultima atualizacao em {formatDateTime(order.updated_at)}
          </Text>
        </View>

        <View
          style={[
            styles.summaryBadge,
            {
              backgroundColor: statusTone.backgroundColor,
              borderColor: statusTone.color,
            },
          ]}>
          <Text style={[styles.summaryBadgeText, { color: statusTone.color }]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>

      <View style={[styles.topGrid, isDesktop && styles.topGridDesktop]}>
        <View style={[styles.panel, isDesktop && styles.topGridItem]}>
          <Text style={styles.panelTitle}>Cliente</Text>
          <Text style={styles.panelHint}>
            O cliente fica bloqueado nesta tela de edicao.
          </Text>

          <View style={styles.selectorCard}>
            <Text style={styles.selectorLabel}>Cliente do pedido</Text>
            <Text style={styles.selectorValue}>{order.customer_name}</Text>
            <Text style={styles.selectorMeta}>
              Para trocar o cliente, crie um novo pedido ou cancele este registro.
            </Text>
          </View>
        </View>

        <View style={[styles.panel, isDesktop && styles.topGridItem]}>
          <Text style={styles.panelTitle}>Entrega</Text>
          <Text style={styles.panelHint}>
            Atualize a data e o horario da entrega.
          </Text>

          <Pressable
            onPress={() => setCalendarOpen(true)}
            style={({ pressed }) => [
              styles.selectorCard,
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
          Ajuste as informacoes internas para producao, embalagem e entrega.
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
              Inclua itens, ajuste quantidades e remova o que nao for necessario.
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
              Use o botao acima para incluir massas ou produtos nesse pedido.
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
          <Text style={styles.totalLabel}>Resumo da edicao</Text>
          <Text style={styles.totalMeta}>
            {lines.length} item(ns) selecionado(s)
          </Text>
          <Text style={styles.totalValue}>{formatMoney(orderTotal)}</Text>
        </View>

        <PrimaryButton
          title="Salvar alteracoes"
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
                  <Pressable
                    style={styles.listCard}
                    onPress={() => {
                      setLines((prev) => addProductLine(prev, item));
                      productPicker.close();
                    }}>
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
  feedbackCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  feedbackText: {
    marginTop: theme.space.xs,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  feedbackAction: {
    marginTop: theme.space.md,
  },
  summaryBar: {
    marginBottom: theme.space.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  summaryText: {
    flex: 1,
  },
  summaryEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryMeta: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  summaryBadge: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
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
  qty: {
    flex: 1,
    height: 48,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.text,
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
});
