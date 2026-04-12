import type { OrderStatus, OrderWithDetails } from '@/types/models';

const FINAL_ORDER_STATUSES: OrderStatus[] = ['entregue', 'cancelado'];

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  pendente: 0,
  producao: 1,
  pronto: 2,
  entregue: 3,
  cancelado: 4,
};

type OrderLike = Pick<OrderWithDetails, 'delivery_at' | 'status'>;

export function isFinalOrderStatus(status: OrderStatus): boolean {
  return FINAL_ORDER_STATUSES.includes(status);
}

export function isOrderOverdue(order: OrderLike, now = new Date()): boolean {
  if (isFinalOrderStatus(order.status)) {
    return false;
  }

  return new Date(order.delivery_at).getTime() < now.getTime();
}

export function compareOrdersByPriority(
  a: OrderLike,
  b: OrderLike,
  now = new Date()
): number {
  const overdueA = isOrderOverdue(a, now);
  const overdueB = isOrderOverdue(b, now);

  if (overdueA !== overdueB) {
    return overdueA ? -1 : 1;
  }

  const byDeadline =
    new Date(a.delivery_at).getTime() - new Date(b.delivery_at).getTime();

  if (byDeadline !== 0) {
    return byDeadline;
  }

  return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
}
