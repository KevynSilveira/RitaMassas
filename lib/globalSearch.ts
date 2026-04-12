import { formatCustomerAddress, formatCustomerPhone } from '@/lib/customerFields';
import { ORDER_STATUS_LABELS } from '@/types/models';
import type { CustomerRow, OrderWithDetails, ProductRow } from '@/types/models';
import { SEARCH_SHORTCUTS, type NavigationShortcut } from './navigationCatalog';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getFieldScore(field: string, query: string) {
  const normalizedField = normalizeSearchText(field);

  if (!normalizedField) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalizedField === query) {
    return 0;
  }

  if (normalizedField.startsWith(query)) {
    return 1;
  }

  const wordIndex = normalizedField.indexOf(` ${query}`);
  if (wordIndex >= 0) {
    return 2 + wordIndex / 1000;
  }

  const matchIndex = normalizedField.indexOf(query);
  if (matchIndex >= 0) {
    return 3 + matchIndex / 1000;
  }

  return Number.POSITIVE_INFINITY;
}

function rankFields(fields: string[], rawQuery: string) {
  const query = normalizeSearchText(rawQuery);

  if (!query) {
    return null;
  }

  const fieldScores = fields
    .map((field) => getFieldScore(field, query))
    .filter((score) => Number.isFinite(score));

  if (fieldScores.length === 0) {
    return null;
  }

  return Math.min(...fieldScores);
}

function sortMatches<T>(
  items: T[],
  rawQuery: string,
  getFields: (item: T) => string[],
  getFallbackLabel: (item: T) => string
) {
  return items
    .map((item) => ({
      item,
      score: rankFields(getFields(item), rawQuery),
      label: normalizeSearchText(getFallbackLabel(item)),
    }))
    .filter((entry): entry is { item: T; score: number; label: string } => entry.score != null)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      return a.label.localeCompare(b.label, 'pt-BR');
    })
    .map((entry) => entry.item);
}

export function hasSearchQuery(value: string) {
  return normalizeSearchText(value).length > 0;
}

export function searchNavigationShortcuts(query: string) {
  return sortMatches(
    SEARCH_SHORTCUTS,
    query,
    (item) => [item.title, item.subtitle, ...(item.keywords ?? [])],
    (item) => item.title
  );
}

export function searchCustomers(query: string, customers: CustomerRow[]) {
  return sortMatches(
    customers,
    query,
    (customer) => [
      customer.name,
      customer.phone ?? '',
      formatCustomerPhone(customer.phone) ?? '',
      customer.address ?? '',
      formatCustomerAddress(customer.address) ?? '',
      customer.notes ?? '',
    ],
    (customer) => customer.name
  );
}

export function searchProducts(query: string, products: ProductRow[]) {
  return sortMatches(
    products,
    query,
    (product) => [product.name, product.recipe ?? ''],
    (product) => product.name
  );
}

export function searchOrders(query: string, orders: OrderWithDetails[]) {
  return sortMatches(
    orders,
    query,
    (order) => [
      `pedido ${order.id}`,
      order.customer_name,
      ORDER_STATUS_LABELS[order.status],
      ...order.items.map((item) => item.product_name),
    ],
    (order) => `${order.customer_name} ${order.id}`
  );
}

export type GlobalSearchResultSet = {
  shortcuts: NavigationShortcut[];
  customers: CustomerRow[];
  products: ProductRow[];
  orders: OrderWithDetails[];
};

