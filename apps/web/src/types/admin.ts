import type {
  Category,
  EngravingConfig,
  Product,
  ShippingZone,
  StoreConfig,
} from './store';

export type AdminRole = 'admin';

export interface AdminSession {
  email: string;
  name: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

export interface AdminLoginResponse {
  token: string;
  expiresIn: number;
  admin: Pick<AdminSession, 'email' | 'name' | 'role'>;
}

export interface ProductVariantPayload {
  id?: string;
  sku: string;
  name: string;
  price?: number | null;
  compareAtPrice?: number | null;
  stock?: number;
  isActive?: boolean;
  position?: number;
  imageUrl?: string | null;
  options?: Record<string, string>;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  images?: string[];
  categoryId?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isFeatured?: boolean;
  stock?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  engraving?: EngravingConfig | null;
  variants?: ProductVariantPayload[];
}

export interface AdminProduct extends Omit<Product, 'status'> {
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductsResponse {
  items: AdminProduct[];
  total: number;
  take: number;
  skip: number;
}

export interface BulkDiscountPayload {
  /** 1–90 para aplicar; null para retirar la oferta. */
  discountPercent: number | null;
  /** Vacío/omitido = todos los productos no archivados. */
  productIds?: string[];
  includeArchived?: boolean;
}

export interface BulkDiscountResponse {
  updated: number;
  affectedProducts: number;
  discountPercent: number | null;
}

export interface AdminCategory extends Category {
  parentId?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  parent?: { id: string; name: string } | null;
  _count?: { products: number; children: number };
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  position?: number;
  isActive?: boolean;
  parentId?: string | null;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED_WHATSAPP'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface AdminOrderItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  total: number;
  options: Record<string, string>;
  engraving?: {
    enabled?: boolean;
    text?: string;
    font?: string;
    fontLabel?: string;
    placement?: string;
    placementLabel?: string;
    price?: number;
  } | null;
}

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  email: string;
  customerName: string;
  phone?: string | null;
  notes?: string | null;
  status: OrderStatus;
  shippingDepartment?: string | null;
  shippingAddress: Record<string, unknown>;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  shippingZone?: ShippingZone | null;
  _count?: { items: number };
}

export interface AdminOrder extends AdminOrderSummary {
  whatsappMessage?: string | null;
  whatsappUrl?: string | null;
  items: AdminOrderItem[];
}

export interface AdminOrdersResponse {
  items: AdminOrderSummary[];
  total: number;
  take: number;
  skip: number;
  statusCounts: Partial<Record<OrderStatus, number>>;
}

export interface AdminStats {
  currency: string;
  revenue: number;
  shippingRevenue: number;
  orders: number;
  acceptedOrders: number;
  pendingOrders: number;
  products: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  categories: number;
  customers: number;
  unitsSold: number;
  averageTicket: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    slug: string;
    stock: number;
    images: string[];
    status: string;
    variants: Array<{ stock: number }>;
  }>;
  recentOrders: Array<AdminOrderSummary & { _count?: { items: number } }>;
  salesByDay: Array<{
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }>;
  statusCounts: Partial<Record<OrderStatus, number>>;
  topProducts: Array<{
    productId: string | null;
    name: string;
    slug: string | null;
    image: string | null;
    quantity: number;
    revenue: number;
  }>;
}

export interface AdminCustomer {
  email: string;
  name: string;
  phone: string | null;
  orders: number;
  totalSpent: number;
  currency: string;
  lastOrderAt: string;
  firstOrderAt: string;
  lastOrderNumber: string;
  lastStatus: OrderStatus;
  department: string | null;
  city: string | null;
}

export interface AdminCustomersResponse {
  items: AdminCustomer[];
  total: number;
  stats: {
    totalCustomers: number;
    repeatCustomers: number;
    averageLifetimeValue: number;
  };
}

export interface AdminShippingZone extends ShippingZone {
  createdAt?: string;
  updatedAt?: string;
  _count?: { orders: number };
}

export interface ShippingZonePayload {
  code: string;
  department: string;
  cities?: string[];
  price: number;
  freeThreshold?: number | null;
  estimatedDays?: string;
  isActive?: boolean;
  position?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  slug: string;
  stock: number;
  status: string;
  images: string[];
  category: { id: string; name: string } | null;
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    stock: number;
    price: number | null;
    isActive: boolean;
  }>;
}

export interface AdminInventoryResponse {
  items: InventoryItem[];
  total: number;
  take: number;
  skip: number;
  stats: {
    totalSkus: number;
    lowStock: number;
    outOfStock: number;
    totalUnits: number;
  };
}

export interface AdminStoreConfig extends StoreConfig {
  domain?: string | null;
  updatedAt: string;
}

export interface StoreConfigPayload {
  storeName?: string;
  tagline?: string;
  domain?: string;
  currency?: string;
  locale?: string;
  country?: string;
  whatsappNumber?: string;
  themeId?: string;
  navigation?: Record<string, unknown>;
  footer?: Record<string, unknown>;
  valueProps?: Record<string, unknown> | unknown[];
  homeLayout?: unknown[];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED_WHATSAPP: 'Confirmado WhatsApp',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export const PRODUCT_STATUS_LABELS: Record<
  'DRAFT' | 'ACTIVE' | 'ARCHIVED',
  string
> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Publicado',
  ARCHIVED: 'Archivado',
};
