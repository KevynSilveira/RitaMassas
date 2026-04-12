import {
  ActionFeedbackModal,
  type ActionFeedbackButton,
} from '@/components/ui/ActionFeedbackModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { PageHeader } from '@/components/ui/PageHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProductThumbnail } from '@/components/ui/ProductThumbnail';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCustomerAddress, formatCustomerPhone } from '@/lib/customerFields';
import {
  getCustomer,
  getOrderWithDetails,
  updateOrderMeta,
} from '@/lib/database';
import { formatDateTime, formatMoney } from '@/lib/format';
import { isFinalOrderStatus, isOrderOverdue } from '@/lib/orderUtils';
import { getOrderStatusTone } from '@/lib/orderStatusTone';
import type { CustomerRow, OrderStatus } from '@/types/models';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/types/models';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function PedidoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const orderId = Number(id);

  const [order, setOrder] = useState<Awaited<
    ReturnType<typeof getOrderWithDetails>
  > | null>(null);
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState<OrderStatus | null>(null);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    primaryAction?: ActionFeedbackButton;
    secondaryAction?: ActionFeedbackButton;
  } | null>(null);

  const closeFeedback = () => setFeedback(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId)) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextOrder = await getOrderWithDetails(orderId);
      setOrder(nextOrder);
      if (!nextOrder) {
        setCustomer(null);
        return;
      }

      const nextCustomer = await getCustomer(nextOrder.customer_id);
      setCustomer(nextCustomer);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = order ? isOrderOverdue(order) : false;

  const syncOrder = useCallback(async () => {
    refresh();
    await load();
  }, [load, refresh]);

  const onUpdateStatus = useCallback(
    async (status: OrderStatus) => {
      if (!order) {
        return;
      }

      setSavingStatus(status);
      try {
        await updateOrderMeta(order.id, { status });
        await syncOrder();
        setStatusOpen(false);
        setCancelConfirmOpen(false);
        setFeedback({
          title:
            status === 'cancelado'
              ? 'Pedido cancelado'
              : status === 'entregue'
                ? 'Pedido entregue'
                : 'Status atualizado',
          message:
            status === 'cancelado'
              ? 'O pedido foi marcado como cancelado.'
              : status === 'entregue'
                ? 'O pedido foi marcado como entregue.'
                : 'O novo status do pedido ja foi aplicado.',
          secondaryAction: {
            label: 'OK',
          },
        });
      } catch (error) {
        console.error(error);
        Alert.alert('Erro', 'Nao foi possivel atualizar o status.');
      } finally {
        setSavingStatus(null);
      }
    },
    [order, syncOrder]
  );

  if (loading) {
    return (
      <AppScreen
        contentStyle={
          isDesktop ? styles.screenContentDesktop : styles.screenContentMobile
        }>
        <PageHeader
          title="Pedido"
          subtitle="Carregando os dados do pedido."
          onBack={() => router.back()}
        />

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>Carregando pedido...</Text>
        </View>
      </AppScreen>
    );
  }

  if (!order) {
    return (
      <AppScreen
        contentStyle={
          isDesktop ? styles.screenContentDesktop : styles.screenContentMobile
        }>
        <PageHeader
          title="Pedido"
          subtitle="Nao foi possivel localizar esse pedido."
          onBack={() => router.back()}
        />

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Pedido nao encontrado</Text>
          <Text style={styles.feedbackText}>
            Volte para a lista de pedidos e tente abrir novamente.
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

  const canMarkDelivered = !isFinalOrderStatus(order.status);
  const canCancelOrder =
    order.status !== 'cancelado' && order.status !== 'entregue';
  const statusTone = getOrderStatusTone(order.status);
  const savedNotes = order.notes ?? '';
  const hasNotes = savedNotes.length > 0;
  const customerPhone = formatCustomerPhone(customer?.phone) ?? 'Nao informado';
  const customerAddress =
    formatCustomerAddress(customer?.address) ?? 'Endereco nao informado';
  const customerNotes = customer?.notes?.trim() || 'Sem observacao do cliente.';
  const pageSubtitle = isDesktop
    ? 'Resumo completo do pedido e ajuste rapido do status.'
    : undefined;
  const itemsSummary =
    order.items.length === 1
      ? '1 item cadastrado'
      : `${order.items.length} itens cadastrados`;
  const summaryNote = hasNotes ? savedNotes : 'Sem observacao registrada.';

  const requestCancelOrder = () => {
    setCancelConfirmOpen(true);
  };

  return (
    <AppScreen
      contentStyle={
        isDesktop ? styles.screenContentDesktop : styles.screenContentMobile
      }
      maxWidth={isDesktop ? 1180 : undefined}>
      <PageHeader
        title="Pedido"
        subtitle={pageSubtitle}
        onBack={() => router.back()}
      />

      <View style={styles.detailWrap}>
        <View
          style={[
            styles.detailPanel,
            {
              borderColor: statusTone.color,
            },
          ]}>
          <View style={[styles.detailHeader, !isDesktop && styles.detailHeaderMobile]}>
            <View style={styles.detailHeaderText}>
              <Text style={styles.eyebrow}>Cliente</Text>
              <Text
                style={[styles.customerName, !isDesktop && styles.customerNameMobile]}>
                {order.customer_name}
              </Text>
              <Text
                style={[styles.customerMeta, !isDesktop && styles.customerMetaMobile]}>
                Pedido #{order.id} criado em {formatDateTime(order.created_at)}
              </Text>
            </View>

            <Pressable
              onPress={() => setStatusOpen(true)}
              style={({ pressed }) => [
                styles.statusTrigger,
                !isDesktop && styles.statusTriggerMobile,
                pressed && styles.selectorPressed,
              ]}>
              <Text style={[styles.selectorLabel, styles.statusTriggerLabel]}>
                Status do pedido
              </Text>
              <View
                style={[
                  styles.statusTriggerBadge,
                  {
                    backgroundColor: statusTone.backgroundColor,
                    borderColor: statusTone.color,
                  },
                ]}>
                <Text style={[styles.statusBadgeText, { color: statusTone.color }]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Text>
              </View>
              <Text style={styles.statusTriggerHint}>Toque para alterar</Text>
            </Pressable>
          </View>

          {overdue ? (
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>Pedido em atraso</Text>
              <Text style={styles.alertText}>
                A entrega prevista passou do horario. Atualize o status do pedido.
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.summaryGridLarge,
              isDesktop && styles.summaryGridLargeDesktop,
            ]}>
            <View style={[styles.summaryBox, isDesktop && styles.summaryBoxWide]}>
              <Text style={styles.infoLabel}>Telefone</Text>
              <Text style={[styles.infoValue, !isDesktop && styles.infoValueMobile]}>
                {customerPhone}
              </Text>
            </View>

            <View style={[styles.summaryBox, isDesktop && styles.summaryBoxWide]}>
              <Text style={styles.infoLabel}>Endereco</Text>
              <Text style={[styles.infoValue, !isDesktop && styles.infoValueMobile]}>
                {customerAddress}
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.infoLabel}>Entrega</Text>
              <Text style={[styles.infoValue, !isDesktop && styles.infoValueMobile]}>
                {formatDateTime(order.delivery_at)}
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.infoLabel}>Total</Text>
              <Text style={[styles.infoValue, !isDesktop && styles.infoValueMobile]}>
                {formatMoney(order.total)}
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.infoLabel}>Itens</Text>
              <Text style={[styles.infoValue, !isDesktop && styles.infoValueMobile]}>
                {order.items.length}
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.infoLabel}>Atualizado em</Text>
              <Text style={[styles.infoValue, !isDesktop && styles.infoValueMobile]}>
                {formatDateTime(order.updated_at)}
              </Text>
            </View>
          </View>

          <View style={[styles.notesStrip, isDesktop && styles.notesStripDesktop]}>
            <View style={styles.summaryNoteCard}>
              <Text style={styles.noteLabel}>Observacao do pedido</Text>
              <Text style={[styles.noteText, !isDesktop && styles.noteTextMobile]}>
                {summaryNote}
              </Text>
            </View>

            <View style={styles.summaryNoteCard}>
              <Text style={styles.noteLabel}>Observacao do cliente</Text>
              <Text style={[styles.noteText, !isDesktop && styles.noteTextMobile]}>
                {customerNotes}
              </Text>
            </View>
          </View>

          <View style={styles.summarySection}>
            <View style={[styles.sectionHead, isDesktop && styles.sectionHeadDesktop]}>
              <View style={styles.sectionHeadText}>
                <Text style={[styles.panelTitle, !isDesktop && styles.panelTitleMobile]}>
                  Itens do pedido
                </Text>
              </View>
              <Text style={styles.sectionSummary}>{itemsSummary}</Text>
            </View>

            <View style={[styles.itemsGrid, isDesktop && styles.itemsGridDesktop]}>
              {order.items.map((item, index) => (
                <View
                  key={`${item.product_name}-${index}`}
                  style={[
                    styles.itemCard,
                    isDesktop ? styles.itemCardDesktopGrid : styles.itemCardMobile,
                  ]}>
                  <View style={styles.itemMain}>
                    <ProductThumbnail
                      photoUri={item.photo_uri}
                      size={isDesktop ? 54 : 48}
                    />

                    <View style={styles.itemText}>
                      <Text
                        style={[styles.itemName, !isDesktop && styles.itemNameMobile]}>
                        {item.product_name}
                      </Text>
                      <Text
                        style={[styles.itemMeta, !isDesktop && styles.itemMetaMobile]}>
                        {item.quantity} un. x {formatMoney(item.unit_price)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.itemTotal, !isDesktop && styles.itemTotalMobile]}>
                    {formatMoney(item.quantity * item.unit_price)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.detailActions}>
            <View
              style={[
                styles.secondaryActionRow,
                isDesktop && styles.secondaryActionRowDesktop,
              ]}>
              {canCancelOrder ? (
                <View
                  style={[
                    styles.secondaryActionSlot,
                    isDesktop && styles.secondaryActionSlotDesktop,
                  ]}>
                  <PrimaryButton
                    title="Cancelar pedido"
                    onPress={requestCancelOrder}
                    variant="outline"
                    style={styles.actionRowButton}
                  />
                </View>
              ) : null}

              <View
                style={[
                  styles.secondaryActionSlot,
                  isDesktop && styles.secondaryActionSlotDesktop,
                ]}>
                <PrimaryButton
                  title="Editar pedido"
                  onPress={() =>
                    router.push({
                      pathname: '/pedido/editar/[id]',
                      params: { id: String(order.id) },
                    })
                  }
                  variant="outline"
                  style={styles.actionRowButton}
                />
              </View>
            </View>

            {canMarkDelivered ? (
              <PrimaryButton
                title="Marcar como entregue"
                onPress={() => onUpdateStatus('entregue')}
                loading={savingStatus === 'entregue'}
                style={styles.primaryFullWidthButton}
              />
            ) : null}
          </View>
        </View>
      </View>

      <Modal
        visible={statusOpen}
        transparent
        animationType={isDesktop ? 'fade' : 'slide'}
        onRequestClose={() => setStatusOpen(false)}>
        <View style={[styles.statusDrawerRoot, isDesktop && styles.statusDrawerRootDesktop]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setStatusOpen(false)}
          />

          <View style={[styles.statusDrawer, isDesktop && styles.statusDrawerDesktop]}>
            {isDesktop ? (
              <View style={styles.statusDrawerTab}>
                <Text style={styles.statusDrawerTabText}>Status</Text>
              </View>
            ) : null}

            <View style={styles.statusDrawerHeader}>
              <View style={styles.statusDrawerHeaderText}>
                <Text style={styles.modalTitle}>Alterar status</Text>
                <Text style={styles.modalSubtitle}>
                  Escolha a etapa atual do pedido.
                </Text>
              </View>

              <Pressable onPress={() => setStatusOpen(false)}>
                <Text style={styles.close}>Fechar</Text>
              </Pressable>
            </View>

            <View style={styles.modalList}>
              {ORDER_STATUSES.map((status) => {
                const active = status === order.status;
                const tone = getOrderStatusTone(status);

                return (
                  <Pressable
                    key={status}
                    onPress={() => onUpdateStatus(status)}
                    style={({ pressed }) => [
                      styles.statusRow,
                      active && styles.statusRowActive,
                      pressed && styles.selectorPressed,
                    ]}>
                    <View style={styles.statusRowText}>
                      <Text style={styles.statusRowTitle}>
                        {ORDER_STATUS_LABELS[status]}
                      </Text>
                      <Text style={styles.statusRowHint}>
                        {active ? 'Status atual do pedido.' : 'Toque para aplicar.'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusMiniBadge,
                        {
                          backgroundColor: tone.backgroundColor,
                          borderColor: tone.color,
                        },
                      ]}>
                      <Text style={[styles.statusMiniText, { color: tone.color }]}>
                        {savingStatus === status
                          ? 'Salvando'
                          : active
                            ? 'Atual'
                            : 'Selecionar'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <ActionFeedbackModal
        visible={cancelConfirmOpen}
        title="Cancelar pedido"
        message="O pedido sera marcado como cancelado. Deseja continuar?"
        onClose={() => setCancelConfirmOpen(false)}
        primaryAction={{
          label: savingStatus === 'cancelado' ? 'Cancelando...' : 'Cancelar pedido',
          onPress: () => onUpdateStatus('cancelado'),
          variant: 'primary',
        }}
        secondaryAction={{
          label: 'Voltar',
          variant: 'outline',
        }}
      />

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
  screenContentDesktop: {
    paddingBottom: theme.space.lg,
  },
  screenContentMobile: {
    paddingBottom: theme.space.xs,
  },
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
  detailWrap: {
    width: '100%',
  },
  detailPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  detailHeaderMobile: {
    flexDirection: 'column',
  },
  detailHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  statusTrigger: {
    minWidth: 170,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
    gap: theme.space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTriggerMobile: {
    width: '100%',
  },
  statusTriggerLabel: {
    textAlign: 'center',
  },
  statusTriggerBadge: {
    alignSelf: 'center',
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusTriggerHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  summaryGridLarge: {
    gap: theme.space.sm,
  },
  summaryGridLargeDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
    gap: theme.space.xs,
    flexGrow: 1,
    minWidth: 160,
  },
  summaryBoxWide: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 260,
  },
  notesStrip: {
    gap: theme.space.sm,
  },
  notesStripDesktop: {
    flexDirection: 'row',
  },
  detailActions: {
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
  secondaryActionRow: {
    gap: theme.space.sm,
  },
  secondaryActionRowDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  secondaryActionSlot: {
    width: '100%',
  },
  secondaryActionSlotDesktop: {
    flex: 1,
  },
  actionRowButton: {
    width: '100%',
  },
  primaryFullWidthButton: {
    width: '100%',
  },
  layout: {
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.lg,
  },
  summaryColumn: {},
  summaryColumnDesktop: {
    flex: 1.45,
    minWidth: 0,
  },
  actionsColumn: {},
  actionsColumnDesktop: {
    flex: 1,
    minWidth: 0,
    maxWidth: 520,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  heroHeaderMobile: {
    flexDirection: 'column',
    gap: theme.space.sm,
  },
  heroText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  customerName: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  customerNameMobile: {
    fontSize: 22,
  },
  customerMeta: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  customerMetaMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeMobile: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  alertCard: {
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    backgroundColor: '#FFF1EE',
    borderWidth: 1,
    borderColor: '#E4B3AE',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.danger,
  },
  alertText: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  infoGrid: {
    gap: theme.space.sm,
  },
  infoGridDesktopExpanded: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
    flexShrink: 1,
  },
  infoBoxDesktopLarge: {
    flex: 1.6,
    minWidth: 230,
  },
  infoBoxWideMobile: {
    width: '100%',
  },
  infoBoxCompactMobile: {
    width: '48%',
  },
  infoBoxCompact: {
    flex: 0.8,
    minWidth: 120,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  infoValueMobile: {
    fontSize: 15,
    lineHeight: 20,
  },
  summaryNoteCard: {
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    flex: 1,
    minWidth: 0,
  },
  summarySection: {
    gap: theme.space.sm,
  },
  sectionHead: {
    gap: theme.space.xs,
  },
  sectionHeadDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  sectionHeadText: {
    flex: 1,
    minWidth: 0,
  },
  sectionSummary: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  itemsGrid: {
    gap: theme.space.sm,
  },
  itemsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
  },
  panelTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  panelTitleMobile: {
    fontSize: 16,
  },
  panelHint: {
    marginTop: 4,
    marginBottom: theme.space.md,
    color: theme.colors.textMuted,
    fontSize: theme.font.caption,
    lineHeight: 18,
  },
  panelHintMobile: {
    marginBottom: theme.space.sm,
    fontSize: 12,
    lineHeight: 17,
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
  noteLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noteText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  noteTextMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsGrid: {
    gap: theme.space.sm,
  },
  actionsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
    gap: theme.space.sm,
  },
  actionCardFull: {
    width: '100%',
  },
  actionCardDesktop: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 220,
  },
  actionValue: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  actionValueMobile: {
    fontSize: 15,
  },
  actionMeta: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  actionDetail: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  actionButton: {
    marginTop: theme.space.xs,
  },
  actionButtonSecondary: {
    marginTop: 0,
  },
  inlineCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 12,
    gap: theme.space.xs,
  },
  inlineBadgeCard: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  notesInput: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.font.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  notesInputDesktop: {
    minHeight: 86,
  },
  itemCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: 12,
    gap: theme.space.sm,
  },
  itemCardMobile: {
    padding: 12,
  },
  itemCardDesktopGrid: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    minWidth: 0,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  itemNameMobile: {
    fontSize: 15,
  },
  itemMeta: {
    marginTop: 4,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  itemMetaMobile: {
    fontSize: 13,
    lineHeight: 17,
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  itemTotalMobile: {
    fontSize: 16,
  },
  footerActions: {
    marginTop: theme.space.xs,
  },
  footerActionsDesktop: {
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: 520,
  },
  footerCardDesktop: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
  },
  footerLabelDesktop: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footerHintDesktop: {
    marginTop: theme.space.xs,
    marginBottom: theme.space.md,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  footerButtonsDesktop: {
    flexDirection: 'row',
    gap: theme.space.sm,
  },
  footerButtonsMobile: {
    gap: theme.space.sm,
  },
  markDeliveredButton: {
    width: '100%',
  },
  mobileFooterButton: {
    width: '100%',
  },
  footerSecondaryButtonDesktop: {
    flex: 1,
  },
  markDeliveredButtonDesktop: {
    flex: 1,
    minHeight: 56,
  },
  statusDrawerRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
    paddingTop: theme.space.xl,
  },
  statusDrawerRootDesktop: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.lg,
    paddingLeft: theme.space.lg,
    paddingRight: theme.space.xl * 3,
  },
  statusDrawer: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.space.md,
    gap: theme.space.md,
  },
  statusDrawerDesktop: {
    width: '100%',
    maxWidth: 380,
    borderRadius: theme.radius.lg,
    position: 'relative',
    padding: theme.space.lg,
  },
  statusDrawerTab: {
    position: 'absolute',
    left: -38,
    top: theme.space.xl,
    borderTopLeftRadius: theme.radius.md,
    borderBottomLeftRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minWidth: 48,
    alignItems: 'center',
  },
  statusDrawerTabText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statusDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  statusDrawerHeaderText: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
    paddingTop: theme.space.xl,
  },
  modalRootDesktop: {
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  modalCardDesktop: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    borderRadius: theme.radius.lg,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.md,
    padding: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  close: {
    color: theme.colors.primary,
    fontWeight: '700',
    paddingTop: 2,
  },
  modalList: {
    padding: theme.space.md,
    gap: theme.space.sm,
  },
  statusRow: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  statusRowActive: {
    borderColor: theme.colors.primary,
  },
  statusRowText: {
    flex: 1,
  },
  statusRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusRowHint: {
    marginTop: 4,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  statusMiniBadge: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusMiniText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
