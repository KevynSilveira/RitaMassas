export type OrderStatus =
  | 'pendente'
  | 'producao'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const ORDER_STATUSES: OrderStatus[] = [
  'pendente',
  'producao',
  'pronto',
  'entregue',
  'cancelado',
];

export type ProductRow = {
  id: number;
  name: string;
  price: number;
  recipe: string | null;
  photo_uri: string | null;
  created_at: string;
};

export type CustomerRow = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export type OrderRow = {
  id: number;
  customer_id: number;
  delivery_at: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  rescheduled_from: string | null;
};

export type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
};

export type OrderWithDetails = OrderRow & {
  customer_name: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    photo_uri: string | null;
  }[];
  total: number;
};
