import type {
  Category,
  CreateOrderPayload,
  CreatedOrder,
  Product,
  ShippingZone,
  StoreConfig,
} from '@/types/store';
import {
  fallbackCategories,
  fallbackProducts,
  fallbackShippingZones,
  fallbackStoreConfig,
} from './fallback';

/** URL pública (navegador). Vacía = mismo origen, ruta /api vía proxy. */
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** URL interna (RSC/build). En Hostinger: http://127.0.0.1:3001 */
const SERVER_BASE =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

function baseForServer() {
  return SERVER_BASE.replace(/\/$/, '');
}

function urlFor(client: boolean, path: string) {
  const base = client ? PUBLIC_BASE : baseForServer();
  return `${base.replace(/\/$/, '')}${path}`;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/* ── Lecturas (con fallback para no romper el storefront) ──────────────── */

export async function getStoreConfig(): Promise<StoreConfig> {
  try {
    const res = await fetch(urlFor(false, '/api/store-config'), {
      next: { revalidate: 60, tags: ['store-config'] },
    });
    const data = await readJson<StoreConfig>(res);
    return {
      ...fallbackStoreConfig,
      ...data,
      navigation: data.navigation?.groups?.length
        ? data.navigation
        : fallbackStoreConfig.navigation,
      footer: data.footer?.columns?.length ? data.footer : fallbackStoreConfig.footer,
      homeLayout: Array.isArray(data.homeLayout) && data.homeLayout.length > 0
        ? data.homeLayout
        : fallbackStoreConfig.homeLayout,
    };
  } catch {
    return fallbackStoreConfig;
  }
}

export async function getProducts(params?: {
  category?: string;
  featured?: boolean;
  onSale?: boolean;
  search?: string;
  take?: number;
}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.featured) query.set('featured', 'true');
  if (params?.onSale) query.set('onSale', 'true');
  if (params?.search) query.set('search', params.search);
  if (params?.take) query.set('take', String(params.take));

  try {
    const res = await fetch(
      urlFor(false, `/api/products${query.size ? `?${query}` : ''}`),
      { next: { revalidate: 60, tags: ['products'] } },
    );
    const data = await readJson<Product[]>(res);
    return data.length > 0 ? data : filterFallback(params);
  } catch {
    return filterFallback(params);
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(urlFor(false, `/api/products/${encodeURIComponent(slug)}`), {
      next: { revalidate: 60, tags: ['products', `product:${slug}`] },
    });
    if (res.status === 404) return null;
    return await readJson<Product>(res);
  } catch {
    return fallbackProducts.find((p) => p.slug === slug) ?? null;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(urlFor(false, '/api/categories'), {
      next: { revalidate: 300, tags: ['categories'] },
    });
    const data = await readJson<Category[]>(res);
    return data.length > 0 ? data : fallbackCategories;
  } catch {
    return fallbackCategories;
  }
}

export async function getShippingZones(): Promise<ShippingZone[]> {
  try {
    const res = await fetch(urlFor(false, '/api/shipping-zones'), {
      next: { revalidate: 300, tags: ['shipping'] },
    });
    const data = await readJson<ShippingZone[]>(res);
    return data.length > 0 ? data : fallbackShippingZones;
  } catch {
    return fallbackShippingZones;
  }
}

/* ── Mutaciones (siempre contra la API real) ───────────────────────────── */

export async function createOrder(payload: CreateOrderPayload): Promise<CreatedOrder> {
  const res = await fetch(urlFor(true, '/api/orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJson<CreatedOrder>(res);
}

/** Marca la orden como enviada por WhatsApp (best-effort, no bloquea el flujo). */
export async function confirmWhatsApp(orderNumber: string): Promise<void> {
  try {
    await fetch(
      urlFor(true, `/api/orders/${encodeURIComponent(orderNumber)}/confirm-whatsapp`),
      { method: 'PATCH' },
    );
  } catch {
    /* silencioso: el pedido ya está creado */
  }
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function filterFallback(params?: {
  category?: string;
  featured?: boolean;
  onSale?: boolean;
  search?: string;
  take?: number;
}): Product[] {
  let list = [...fallbackProducts];
  if (params?.category && params.category !== 'todo') {
    list = list.filter((p) => p.category?.slug === params.category);
  }
  if (params?.featured) list = list.filter((p) => p.isFeatured);
  if (params?.onSale) {
    list = list.filter(
      (p) => p.compareAtPrice !== null && p.compareAtPrice !== undefined && p.compareAtPrice > p.price,
    );
  }
  if (params?.search) {
    const term = params.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term),
    );
  }
  return params?.take ? list.slice(0, params.take) : list;
}
