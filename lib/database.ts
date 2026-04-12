import { Platform } from 'react-native';

import type {
  CustomerRow,
  OrderRow,
  OrderStatus,
  OrderWithDetails,
  ProductRow,
} from '@/types/models';

import type { AppSqliteDatabase } from './openAppDatabase';
import * as nativeDatabase from './native-database';
import { callWebRpc, ensureWebServerReady } from './web-api';

const isWeb = Platform.OS === 'web';

type OrderItemInput = {
  product_id: number;
  quantity: number;
  unit_price: number;
};

type OrderMetaPatch = Partial<{
  customer_id: number;
  delivery_at: string;
  notes: string | null;
  status: OrderStatus;
  rescheduled_from: string | null;
}>;

type OrderListOptions = {
  from?: string;
  to?: string;
  status?: OrderStatus | OrderStatus[];
  customerId?: number;
};

export async function getDatabase(): Promise<AppSqliteDatabase | null> {
  if (isWeb) {
    await ensureWebServerReady();
    return null;
  }
  return nativeDatabase.getDatabase();
}

export async function listProducts(): Promise<ProductRow[]> {
  if (isWeb) return callWebRpc<ProductRow[]>('listProducts');
  return nativeDatabase.listProducts();
}

export async function getProduct(id: number): Promise<ProductRow | null> {
  if (isWeb) return callWebRpc<ProductRow | null>('getProduct', id);
  return nativeDatabase.getProduct(id);
}

export async function insertProduct(
  row: Omit<ProductRow, 'id' | 'created_at'>
): Promise<number> {
  if (isWeb) return callWebRpc<number>('insertProduct', row);
  return nativeDatabase.insertProduct(row);
}

export async function updateProduct(
  id: number,
  row: Partial<Pick<ProductRow, 'name' | 'price' | 'recipe' | 'photo_uri'>>
): Promise<void> {
  if (isWeb) return callWebRpc<void>('updateProduct', id, row);
  return nativeDatabase.updateProduct(id, row);
}

export async function deleteProduct(id: number): Promise<void> {
  if (isWeb) return callWebRpc<void>('deleteProduct', id);
  return nativeDatabase.deleteProduct(id);
}

export async function listCustomers(): Promise<CustomerRow[]> {
  if (isWeb) return callWebRpc<CustomerRow[]>('listCustomers');
  return nativeDatabase.listCustomers();
}

export async function getCustomer(id: number): Promise<CustomerRow | null> {
  if (isWeb) return callWebRpc<CustomerRow | null>('getCustomer', id);
  return nativeDatabase.getCustomer(id);
}

export async function insertCustomer(
  row: Omit<CustomerRow, 'id' | 'created_at'>
): Promise<number> {
  if (isWeb) return callWebRpc<number>('insertCustomer', row);
  return nativeDatabase.insertCustomer(row);
}

export async function updateCustomer(
  id: number,
  row: Partial<Pick<CustomerRow, 'name' | 'phone' | 'address' | 'notes'>>
): Promise<void> {
  if (isWeb) return callWebRpc<void>('updateCustomer', id, row);
  return nativeDatabase.updateCustomer(id, row);
}

export async function deleteCustomer(id: number): Promise<void> {
  if (isWeb) return callWebRpc<void>('deleteCustomer', id);
  return nativeDatabase.deleteCustomer(id);
}

export async function insertOrder(
  customerId: number,
  deliveryAt: string,
  notes: string | null,
  items: OrderItemInput[]
): Promise<number> {
  if (isWeb) {
    return callWebRpc<number>('insertOrder', customerId, deliveryAt, notes, items);
  }
  return nativeDatabase.insertOrder(customerId, deliveryAt, notes, items);
}

export async function updateOrderItems(
  orderId: number,
  items: OrderItemInput[]
): Promise<void> {
  if (isWeb) return callWebRpc<void>('updateOrderItems', orderId, items);
  return nativeDatabase.updateOrderItems(orderId, items);
}

export async function updateOrderMeta(
  id: number,
  patch: OrderMetaPatch
): Promise<void> {
  if (isWeb) return callWebRpc<void>('updateOrderMeta', id, patch);
  return nativeDatabase.updateOrderMeta(id, patch);
}

export async function rescheduleOrder(
  id: number,
  newDeliveryAt: string
): Promise<void> {
  if (isWeb) return callWebRpc<void>('rescheduleOrder', id, newDeliveryAt);
  return nativeDatabase.rescheduleOrder(id, newDeliveryAt);
}

export async function getOrder(id: number): Promise<OrderRow | null> {
  if (isWeb) return callWebRpc<OrderRow | null>('getOrder', id);
  return nativeDatabase.getOrder(id);
}

export async function listOrderItems(orderId: number): Promise<OrderItemInput[]> {
  if (isWeb) return callWebRpc<OrderItemInput[]>('listOrderItems', orderId);
  return nativeDatabase.listOrderItems(orderId);
}

export async function getOrderWithDetails(
  id: number
): Promise<OrderWithDetails | null> {
  if (isWeb) return callWebRpc<OrderWithDetails | null>('getOrderWithDetails', id);
  return nativeDatabase.getOrderWithDetails(id);
}

export async function listOrdersWithDetails(
  options?: OrderListOptions
): Promise<OrderWithDetails[]> {
  if (isWeb) return callWebRpc<OrderWithDetails[]>('listOrdersWithDetails', options);
  return nativeDatabase.listOrdersWithDetails(options);
}

export async function dashboardOrders(): Promise<{
  upcoming: OrderWithDetails[];
  pending: OrderWithDetails[];
}> {
  if (isWeb) {
    return callWebRpc<{ upcoming: OrderWithDetails[]; pending: OrderWithDetails[] }>(
      'dashboardOrders'
    );
  }
  return nativeDatabase.dashboardOrders();
}

export async function ordersForCalendarMonth(
  year: number,
  month: number
): Promise<OrderWithDetails[]> {
  if (isWeb) return callWebRpc<OrderWithDetails[]>('ordersForCalendarMonth', year, month);
  return nativeDatabase.ordersForCalendarMonth(year, month);
}

export async function productRankings(
  from?: string,
  to?: string
): Promise<{ product_id: number; name: string; total_qty: number }[]> {
  if (isWeb) {
    return callWebRpc<{ product_id: number; name: string; total_qty: number }[]>(
      'productRankings',
      from,
      to
    );
  }
  return nativeDatabase.productRankings(from, to);
}

export async function financialSummary(
  from: string,
  to: string
): Promise<{
  orderCount: number;
  totalRevenue: number;
  deliveredCount: number;
  cancelledCount: number;
  byStatus: Record<string, number>;
}> {
  if (isWeb) {
    return callWebRpc<{
      orderCount: number;
      totalRevenue: number;
      deliveredCount: number;
      cancelledCount: number;
      byStatus: Record<string, number>;
    }>('financialSummary', from, to);
  }
  return nativeDatabase.financialSummary(from, to);
}

export async function customersWithOrderCount(
  from?: string,
  to?: string
): Promise<{ id: number; name: string; order_count: number }[]> {
  if (isWeb) {
    return callWebRpc<{ id: number; name: string; order_count: number }[]>(
      'customersWithOrderCount',
      from,
      to
    );
  }
  return nativeDatabase.customersWithOrderCount(from, to);
}
