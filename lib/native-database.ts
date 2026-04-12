import type {
  CustomerRow,
  OrderRow,
  OrderStatus,
  OrderWithDetails,
  ProductRow,
} from '@/types/models';

import { type AppSqliteDatabase, openAppDatabase } from './openAppDatabase';

let dbInstance: AppSqliteDatabase | null = null;

async function beginTransaction(db: AppSqliteDatabase) {
  await db.execAsync('BEGIN');
}

async function commitTransaction(db: AppSqliteDatabase) {
  await db.execAsync('COMMIT');
}

async function rollbackTransaction(db: AppSqliteDatabase) {
  try {
    await db.execAsync('ROLLBACK');
  } catch (rollbackError) {
    console.warn('ritamassas: rollback falhou', rollbackError);
  }
}

export async function getDatabase(): Promise<AppSqliteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openAppDatabase();
  return dbInstance;
}

export async function listProducts(): Promise<ProductRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ProductRow>(
    'SELECT * FROM products ORDER BY name COLLATE NOCASE'
  );
}

export async function getProduct(id: number): Promise<ProductRow | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE id = ?', [
      id,
    ])) ?? null
  );
}

export async function insertProduct(
  row: Omit<ProductRow, 'id' | 'created_at'>
): Promise<number> {
  const db = await getDatabase();
  const created = new Date().toISOString();
  const r = await db.runAsync(
    `INSERT INTO products (name, price, recipe, photo_uri, created_at) VALUES (?, ?, ?, ?, ?)`,
    row.name,
    row.price,
    row.recipe ?? null,
    row.photo_uri ?? null,
    created
  );
  return r.lastInsertRowId;
}

export async function updateProduct(
  id: number,
  row: Partial<Pick<ProductRow, 'name' | 'price' | 'recipe' | 'photo_uri'>>
): Promise<void> {
  const db = await getDatabase();
  const cur = await getProduct(id);
  if (!cur) return;
  await db.runAsync(
    `UPDATE products SET name = ?, price = ?, recipe = ?, photo_uri = ? WHERE id = ?`,
    row.name ?? cur.name,
    row.price ?? cur.price,
    row.recipe !== undefined ? row.recipe : cur.recipe,
    row.photo_uri !== undefined ? row.photo_uri : cur.photo_uri,
    id
  );
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM products WHERE id = ?', id);
}

export async function listCustomers(): Promise<CustomerRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<CustomerRow>(
    'SELECT * FROM customers ORDER BY name COLLATE NOCASE'
  );
}

export async function getCustomer(id: number): Promise<CustomerRow | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<CustomerRow>(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    )) ?? null
  );
}

export async function insertCustomer(
  row: Omit<CustomerRow, 'id' | 'created_at'>
): Promise<number> {
  const db = await getDatabase();
  const created = new Date().toISOString();
  const r = await db.runAsync(
    `INSERT INTO customers (name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?)`,
    row.name,
    row.phone ?? null,
    row.address ?? null,
    row.notes ?? null,
    created
  );
  return r.lastInsertRowId;
}

export async function updateCustomer(
  id: number,
  row: Partial<Pick<CustomerRow, 'name' | 'phone' | 'address' | 'notes'>>
): Promise<void> {
  const db = await getDatabase();
  const cur = await getCustomer(id);
  if (!cur) return;
  await db.runAsync(
    `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?`,
    row.name ?? cur.name,
    row.phone !== undefined ? row.phone : cur.phone,
    row.address !== undefined ? row.address : cur.address,
    row.notes !== undefined ? row.notes : cur.notes,
    id
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM customers WHERE id = ?', id);
}

export async function insertOrder(
  customerId: number,
  deliveryAt: string,
  notes: string | null,
  items: { product_id: number; quantity: number; unit_price: number }[]
): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await beginTransaction(db);
  try {
    const r = await db.runAsync(
      `INSERT INTO orders (customer_id, delivery_at, status, notes, created_at, updated_at, rescheduled_from)
       VALUES (?, ?, 'pendente', ?, ?, ?, NULL)`,
      customerId,
      deliveryAt,
      notes,
      now,
      now
    );
    const orderId = r.lastInsertRowId;
    for (const it of items) {
      await db.runAsync(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
        orderId,
        it.product_id,
        it.quantity,
        it.unit_price
      );
    }
    await commitTransaction(db);
    return orderId;
  } catch (e) {
    await rollbackTransaction(db);
    throw e;
  }
}

export async function updateOrderItems(
  orderId: number,
  items: { product_id: number; quantity: number; unit_price: number }[]
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await beginTransaction(db);
  try {
    await db.runAsync('DELETE FROM order_items WHERE order_id = ?', orderId);
    for (const it of items) {
      await db.runAsync(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
        orderId,
        it.product_id,
        it.quantity,
        it.unit_price
      );
    }
    await db.runAsync('UPDATE orders SET updated_at = ? WHERE id = ?', now, orderId);
    await commitTransaction(db);
  } catch (e) {
    await rollbackTransaction(db);
    throw e;
  }
}

export async function updateOrderMeta(
  id: number,
  patch: Partial<{
    customer_id: number;
    delivery_at: string;
    notes: string | null;
    status: OrderStatus;
    rescheduled_from: string | null;
  }>
): Promise<void> {
  const db = await getDatabase();
  const cur = await getOrder(id);
  if (!cur) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE orders SET
      customer_id = ?,
      delivery_at = ?,
      notes = ?,
      status = ?,
      rescheduled_from = ?,
      updated_at = ?
    WHERE id = ?`,
    patch.customer_id ?? cur.customer_id,
    patch.delivery_at ?? cur.delivery_at,
    patch.notes !== undefined ? patch.notes : cur.notes,
    patch.status ?? cur.status,
    patch.rescheduled_from !== undefined
      ? patch.rescheduled_from
      : cur.rescheduled_from,
    now,
    id
  );
}

export async function rescheduleOrder(
  id: number,
  newDeliveryAt: string
): Promise<void> {
  const cur = await getOrder(id);
  if (!cur) return;
  await updateOrderMeta(id, {
    delivery_at: newDeliveryAt,
    rescheduled_from: cur.delivery_at,
  });
}

export async function getOrder(id: number): Promise<OrderRow | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<OrderRow>('SELECT * FROM orders WHERE id = ?', [
      id,
    ])) ?? null
  );
}

export async function listOrderItems(orderId: number): Promise<
  { product_id: number; quantity: number; unit_price: number }[]
> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = ?',
    orderId
  );
}

async function hydrateOrderDetails(
  row: OrderRow & { customer_name: string }
): Promise<OrderWithDetails> {
  const db = await getDatabase();
  const items = await db.getAllAsync<{
    product_name: string;
    quantity: number;
    unit_price: number;
    photo_uri: string | null;
  }>(
    `SELECT p.name AS product_name, p.photo_uri AS photo_uri, oi.quantity, oi.unit_price
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    row.id
  );
  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const { customer_name, ...order } = row;
  return {
    ...order,
    customer_name,
    items,
    total,
  };
}

export async function getOrderWithDetails(
  id: number
): Promise<OrderWithDetails | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<OrderRow & { customer_name: string }>(
    `SELECT o.*, c.name AS customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.id = ?`,
    [id]
  );
  if (!row) return null;
  return hydrateOrderDetails(row);
}

export async function listOrdersWithDetails(options?: {
  from?: string;
  to?: string;
  status?: OrderStatus | OrderStatus[];
  customerId?: number;
}): Promise<OrderWithDetails[]> {
  const db = await getDatabase();
  let sql = `SELECT o.*, c.name AS customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE 1=1`;
  const params: (string | number)[] = [];
  if (options?.from) {
    sql += ' AND o.delivery_at >= ?';
    params.push(options.from);
  }
  if (options?.to) {
    sql += ' AND o.delivery_at <= ?';
    params.push(options.to);
  }
  if (options?.status) {
    const st = Array.isArray(options.status)
      ? options.status
      : [options.status];
    sql += ` AND o.status IN (${st.map(() => '?').join(',')})`;
    params.push(...st);
  }
  if (options?.customerId != null) {
    sql += ' AND o.customer_id = ?';
    params.push(options.customerId);
  }
  sql += ' ORDER BY o.delivery_at ASC, o.id ASC';
  const rows = await db.getAllAsync<OrderRow & { customer_name: string }>(
    sql,
    ...params
  );
  const out: OrderWithDetails[] = [];
  for (const r of rows) {
    out.push(await hydrateOrderDetails(r));
  }
  return out;
}

export async function dashboardOrders(): Promise<{
  upcoming: OrderWithDetails[];
  pending: OrderWithDetails[];
}> {
  const db = await getDatabase();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setHours(0, 0, 0, 0);
  const isoStart = start.toISOString();
  const rows = await db.getAllAsync<OrderRow & { customer_name: string }>(
    `SELECT o.*, c.name AS customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.status NOT IN ('entregue', 'cancelado')
     ORDER BY o.delivery_at ASC LIMIT 50`
  );
  const all = await Promise.all(rows.map((r) => hydrateOrderDetails(r)));
  const pending = all.filter((o) => o.status === 'pendente');
  const upcoming = all.filter((o) => o.delivery_at >= isoStart);
  return { upcoming, pending };
}

export async function ordersForCalendarMonth(
  year: number,
  month: number
): Promise<OrderWithDetails[]> {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return listOrdersWithDetails({
    from: from.toISOString(),
    to: to.toISOString(),
  });
}

export async function productRankings(
  from?: string,
  to?: string
): Promise<{ product_id: number; name: string; total_qty: number }[]> {
  const db = await getDatabase();
  let sql = `
    SELECT p.id AS product_id, p.name, SUM(oi.quantity) AS total_qty
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelado'`;
  const params: string[] = [];
  if (from) {
    sql += ' AND o.delivery_at >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND o.delivery_at <= ?';
    params.push(to);
  }
  sql += ' GROUP BY p.id ORDER BY total_qty DESC';
  return db.getAllAsync(sql, ...params);
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
  const db = await getDatabase();
  const orders = await db.getAllAsync<OrderRow>(
    `SELECT * FROM orders WHERE delivery_at >= ? AND delivery_at <= ?`,
    from,
    to
  );
  let totalRevenue = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  const byStatus: Record<string, number> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (o.status === 'cancelado') {
      cancelledCount++;
      continue;
    }
    const items = await db.getAllAsync<{ quantity: number; unit_price: number }>(
      'SELECT quantity, unit_price FROM order_items WHERE order_id = ?',
      o.id
    );
    const sum = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    totalRevenue += sum;
    if (o.status === 'entregue') deliveredCount++;
  }
  return {
    orderCount: orders.length,
    totalRevenue,
    deliveredCount,
    cancelledCount,
    byStatus,
  };
}

export async function customersWithOrderCount(
  from?: string,
  to?: string
): Promise<{ id: number; name: string; order_count: number }[]> {
  const db = await getDatabase();
  let sql = `
    SELECT c.id, c.name, COUNT(o.id) AS order_count
    FROM customers c
    INNER JOIN orders o ON o.customer_id = c.id`;
  const params: string[] = [];
  if (from) {
    sql += ' AND o.delivery_at >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND o.delivery_at <= ?';
    params.push(to);
  }
  sql += ' GROUP BY c.id ORDER BY order_count DESC';
  return db.getAllAsync(sql, ...params);
}
