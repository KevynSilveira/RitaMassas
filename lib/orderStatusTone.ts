import { theme } from '@/constants/theme';
import type { OrderStatus } from '@/types/models';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pendente: theme.colors.warning,
  producao: theme.colors.accent,
  pronto: theme.colors.success,
  entregue: theme.colors.textMuted,
  cancelado: theme.colors.danger,
};

export function getOrderStatusTone(status: OrderStatus) {
  const color = STATUS_COLORS[status];
  return {
    color,
    backgroundColor: `${color}22`,
  };
}
