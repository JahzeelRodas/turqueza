import type {
  AdminCategory,
  AdminCustomersResponse,
  AdminInventoryResponse,
  AdminLoginResponse,
  AdminOrder,
  AdminOrdersResponse,
  AdminProduct,
  AdminProductsResponse,
  AdminSession,
  AdminShippingZone,
  AdminStats,
  AdminStoreConfig,
  BulkDiscountPayload,
  BulkDiscountResponse,
  CategoryPayload,
  OrderStatus,
  ProductPayload,
  ShippingZonePayload,
  StoreConfigPayload,
} from '@/types/admin';
import type { AdminProduct as AdminProductType } from '@/types/admin';

const TOKEN_KEY = 'turquesa.admin.token';
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

/* ── Sesión ────────────────────────────────────────────────────────────── */

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearAdminSession() {
  setAdminToken(null);
}

export function isAdminTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const base64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/admin/login')) return;
  clearAdminSession();
  window.location.href = '/admin/login?expired=1';
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  return request<AdminLoginResponse>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
    skipRedirect: true,
  });
}

export function getAdminSession(): Promise<{ admin: AdminSession }> {
  return request('/api/admin/auth/me');
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */

export function getStats(): Promise<AdminStats> {
  return request('/api/admin/stats');
}

/* ── Productos ─────────────────────────────────────────────────────────── */

export function listProducts(params?: {
  search?: string;
  status?: string;
  category?: string;
  lowStock?: boolean;
  sort?: string;
  take?: number;
  skip?: number;
}): Promise<AdminProductsResponse> {
  return request(`/api/admin/products${query(params)}`);
}

export function getProduct(id: string): Promise<AdminProductType> {
  return request(`/api/admin/products/${encodeURIComponent(id)}`);
}

export function createProduct(payload: ProductPayload): Promise<AdminProduct> {
  return request('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(
  id: string,
  payload: Partial<ProductPayload>,
): Promise<AdminProduct> {
  return request(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: string): Promise<{ deleted: boolean }> {
  return request(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function duplicateProduct(id: string): Promise<AdminProduct> {
  return request(`/api/admin/products/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
  });
}

export function updateProductStatus(
  id: string,
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
): Promise<AdminProduct> {
  return request(`/api/admin/products/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function updateProductStock(
  id: string,
  stock: number,
): Promise<AdminProduct> {
  return request(`/api/admin/products/${encodeURIComponent(id)}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  });
}

/** Aplica o retira una oferta porcentual en lote. */
export function bulkDiscount(
  payload: BulkDiscountPayload,
): Promise<BulkDiscountResponse> {
  return request('/api/admin/products/bulk-discount', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateVariantStock(
  productId: string,
  variantId: string,
  stock: number,
): Promise<unknown> {
  return request(
    `/api/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
    { method: 'PATCH', body: JSON.stringify({ stock }) },
  );
}

/* ── Categorías ────────────────────────────────────────────────────────── */

export function listCategories(): Promise<AdminCategory[]> {
  return request('/api/admin/categories');
}

export function createCategory(
  payload: CategoryPayload,
): Promise<AdminCategory> {
  return request('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<AdminCategory> {
  return request(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteCategory(id: string): Promise<{ deleted: boolean }> {
  return request(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/* ── Pedidos ───────────────────────────────────────────────────────────── */

export function listOrders(params?: {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  take?: number;
  skip?: number;
}): Promise<AdminOrdersResponse> {
  return request(`/api/admin/orders${query(params)}`);
}

export function getOrder(orderNumber: string): Promise<AdminOrder> {
  return request(`/api/admin/orders/${encodeURIComponent(orderNumber)}`);
}

export function updateOrderStatus(
  orderNumber: string,
  status: OrderStatus,
): Promise<AdminOrder> {
  return request(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}

export function updateOrderNotes(
  orderNumber: string,
  notes: string,
): Promise<AdminOrder> {
  return request(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}/notes`,
    { method: 'PATCH', body: JSON.stringify({ notes }) },
  );
}

/* ── Clientes ──────────────────────────────────────────────────────────── */

export function listCustomers(search?: string): Promise<AdminCustomersResponse> {
  return request(`/api/admin/customers${query({ search })}`);
}

/* ── Inventario ────────────────────────────────────────────────────────── */

export function listInventory(params?: {
  search?: string;
  lowStock?: boolean;
  take?: number;
  skip?: number;
}): Promise<AdminInventoryResponse> {
  return request(`/api/admin/inventory${query(params)}`);
}

/* ── Envíos ────────────────────────────────────────────────────────────── */

export function listShippingZones(): Promise<AdminShippingZone[]> {
  return request('/api/admin/shipping-zones');
}

export function createShippingZone(
  payload: ShippingZonePayload,
): Promise<AdminShippingZone> {
  return request('/api/admin/shipping-zones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateShippingZone(
  id: string,
  payload: Partial<ShippingZonePayload>,
): Promise<AdminShippingZone> {
  return request(`/api/admin/shipping-zones/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteShippingZone(id: string): Promise<{ deleted: boolean }> {
  return request(`/api/admin/shipping-zones/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/* ── Configuración de tienda ───────────────────────────────────────────── */

export function getStoreConfig(): Promise<AdminStoreConfig> {
  return request('/api/admin/store-config');
}

export function updateStoreConfig(
  payload: StoreConfigPayload,
): Promise<AdminStoreConfig> {
  return request('/api/admin/store-config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/* ── Internals ─────────────────────────────────────────────────────────── */

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  skipRedirect?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, skipRedirect, headers, ...init } = options;
  const token = skipAuth ? null : getAdminToken();

  let res: Response;
  try {
    res = await fetch(`${PUBLIC_BASE.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new AdminApiError(
      'No se pudo conectar con la API. Verifica que el servidor esté en línea.',
      0,
    );
  }

  if (!res.ok) {
    if (res.status === 401 && !skipRedirect) redirectToLogin();
    const body = await res.json().catch(() => null);
    const message = extractMessage(body) ?? `Error ${res.status}`;
    throw new AdminApiError(message, res.status);
  }

  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && token) {
    await revalidateStorefront(revalidationTags(path), token);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Tags del storefront que deben invalidarse según el recurso modificado. */
function revalidationTags(path: string): string[] {
  if (path.startsWith('/api/admin/products')) return ['products', 'categories'];
  if (path.startsWith('/api/admin/categories')) return ['categories', 'products'];
  if (path.startsWith('/api/admin/store-config')) return ['store-config'];
  if (path.startsWith('/api/admin/shipping-zones')) return ['shipping'];
  return [];
}

/**
 * Pide a Next.js que invalide las cachés del storefront.
 * Un fallo aquí nunca debe hacer fallar la operación del panel.
 */
async function revalidateStorefront(tags: string[], token: string): Promise<void> {
  if (tags.length === 0) return;
  try {
    await fetch('/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tags }),
      cache: 'no-store',
    });
  } catch {
    // La mutación ya se guardó; la tienda se actualizará en la próxima revalidación.
  }
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const message = record.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;
  if (typeof record.error === 'string') return record.error;
  return null;
}

function query(params?: Record<string, unknown>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}
