import type { CustomerRow, ProductRow } from '@/types/models';
import {
  formatCustomerAddress,
  formatCustomerPhone,
  getPhoneDigits,
} from './customerFields';

export type OrderLine = {
  product_id: number;
  quantity: number;
  unit_price: number;
};

export const DELIVERY_TIME_OPTIONS = [
  '08:00',
  '10:00',
  '12:00',
  '14:00',
  '16:00',
  '18:00',
  '20:00',
] as const;

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function createDefaultDelivery() {
  return getNextAvailableDelivery();
}

export function parseDeliveryTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export function buildDeliveryDate(baseDate: Date, time: string) {
  const parsed = parseDeliveryTime(time);

  if (!parsed) {
    return null;
  }

  const nextDate = new Date(baseDate);
  nextDate.setHours(parsed.hours, parsed.minutes, 0, 0);
  return nextDate;
}

export function getNextAvailableDelivery(reference = new Date()) {
  for (const time of DELIVERY_TIME_OPTIONS) {
    const candidate = buildDeliveryDate(reference, time);

    if (candidate && candidate.getTime() > reference.getTime()) {
      return candidate;
    }
  }

  const tomorrow = new Date(reference);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return buildDeliveryDate(tomorrow, DELIVERY_TIME_OPTIONS[0]) ?? tomorrow;
}

export function validateDeliveryDate(
  delivery: Date
): { title: string; message: string } | null {
  if (!Number.isFinite(delivery.getTime())) {
    return {
      title: 'Entrega',
      message: 'Selecione uma data e um horario validos para a entrega.',
    };
  }

  if (delivery.getTime() <= Date.now()) {
    return {
      title: 'Entrega',
      message:
        'A entrega precisa estar em uma data e horario posteriores ao momento atual.',
    };
  }

  return null;
}

export function filterCustomers(
  customers: CustomerRow[],
  search: string
): CustomerRow[] {
  const query = normalizeQuery(search);
  if (!query) return customers;

  return customers.filter((customer) =>
    [
      customer.name,
      formatCustomerPhone(customer.phone) ?? '',
      getPhoneDigits(customer.phone),
      formatCustomerAddress(customer.address) ?? '',
      customer.address ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(query)
  );
}

export function filterProducts(
  products: ProductRow[],
  search: string
): ProductRow[] {
  const query = normalizeQuery(search);
  if (!query) return products;

  return products.filter((product) =>
    [product.name, product.recipe ?? ''].join(' ').toLowerCase().includes(query)
  );
}

export function addProductLine(lines: OrderLine[], product: ProductRow): OrderLine[] {
  return [
    ...lines,
    { product_id: product.id, quantity: 1, unit_price: product.price },
  ];
}

export function updateLineQuantity(
  lines: OrderLine[],
  index: number,
  value: string
): OrderLine[] {
  const quantity = parseFloat(value.replace(',', '.')) || 0;

  return lines.map((line, currentIndex) =>
    currentIndex === index ? { ...line, quantity } : line
  );
}

export function adjustLineQuantity(
  lines: OrderLine[],
  index: number,
  delta: number
): OrderLine[] {
  return lines.map((line, currentIndex) =>
    currentIndex === index
      ? { ...line, quantity: Math.max(1, line.quantity + delta) }
      : line
  );
}

export function removeLine(lines: OrderLine[], index: number): OrderLine[] {
  return lines.filter((_, currentIndex) => currentIndex !== index);
}

export function calculateOrderTotal(lines: OrderLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
}

export function validateOrderBeforeSave(
  customerId: number | null,
  lines: OrderLine[],
  delivery: Date
): { title: string; message: string } | null {
  if (customerId == null) {
    return { title: 'Cliente', message: 'Selecione um cliente.' };
  }

  if (lines.length === 0) {
    return {
      title: 'Itens',
      message: 'O pedido precisa ter pelo menos um produto antes de ser salvo.',
    };
  }

  if (lines.some((line) => line.quantity <= 0)) {
    return {
      title: 'Quantidade',
      message: 'Todos os itens do pedido precisam ter quantidade maior que zero.',
    };
  }

  return validateDeliveryDate(delivery);
}
