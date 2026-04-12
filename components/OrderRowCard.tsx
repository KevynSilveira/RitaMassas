import { theme } from '@/constants/theme';
import { formatDateTime, formatMoney } from '@/lib/format';
import { isOrderOverdue } from '@/lib/orderUtils';
import { ORDER_STATUS_LABELS } from '@/types/models';
import type { OrderWithDetails } from '@/types/models';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const statusColors: Record<string, string> = {
  pendente: theme.colors.warning,
  producao: theme.colors.accent,
  pronto: theme.colors.success,
  entregue: theme.colors.textMuted,
  cancelado: theme.colors.danger,
};

type Props = {
  order: OrderWithDetails;
  compact?: boolean;
};

export function OrderRowCard({ order, compact = false }: Props) {
  const router = useRouter();
  const overdue = isOrderOverdue(order);

  return (
    <Pressable
      onPress={() => router.push(`/pedido/${order.id}`)}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        overdue && styles.cardOverdue,
        pressed && styles.pressed,
      ]}>
      <View style={styles.top}>
        <Text style={[styles.customer, compact && styles.customerCompact]} numberOfLines={1}>
          {order.customer_name}
        </Text>

        <View
          style={[
            styles.badge,
            compact && styles.badgeCompact,
            { backgroundColor: `${statusColors[order.status]}33` },
          ]}>
          <Text
            style={[
              styles.badgeText,
              compact && styles.badgeTextCompact,
              { color: statusColors[order.status] },
            ]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text
          style={[
            styles.date,
            compact && styles.dateCompact,
            overdue && styles.dateOverdue,
          ]}>
          {formatDateTime(order.delivery_at)}
        </Text>

        {overdue ? (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueText}>Atrasado</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.total, compact && styles.totalCompact]}>
        {formatMoney(order.total)}
      </Text>

      {order.items.length > 0 ? (
        <Text
          style={[styles.items, compact && styles.itemsCompact]}
          numberOfLines={compact ? 1 : 2}>
          {order.items
            .map((item) => `${item.product_name} x ${item.quantity}`)
            .join(' | ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardCompact: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  cardOverdue: {
    borderColor: theme.colors.danger,
    backgroundColor: '#FFF7F6',
  },
  pressed: {
    opacity: 0.92,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  customer: {
    flex: 1,
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: theme.colors.text,
  },
  customerCompact: {
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: theme.font.small,
    fontWeight: '600',
  },
  badgeTextCompact: {
    fontSize: 11,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  date: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  dateCompact: {
    fontSize: 12,
  },
  dateOverdue: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  overdueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: '#F7E3E2',
  },
  overdueText: {
    color: theme.colors.danger,
    fontSize: theme.font.small,
    fontWeight: '700',
  },
  total: {
    marginTop: 4,
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  totalCompact: {
    fontSize: 14,
  },
  items: {
    marginTop: 6,
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  itemsCompact: {
    marginTop: 4,
  },
});
