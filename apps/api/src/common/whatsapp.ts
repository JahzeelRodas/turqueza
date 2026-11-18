/**
 * Construcción del mensaje de checkout para WhatsApp.
 *
 * Vive en la API para que el mensaje guardado en la orden (`whatsappMessage`)
 * y el que abre el cliente sean exactamente el mismo. El storefront también
 * tiene una copia del formateador para el checkout local (ver apps/web/src/lib/whatsapp.ts).
 */

export interface WhatsAppEngraving {
  enabled?: boolean;
  text?: string;
  fontLabel?: string;
  placementLabel?: string;
  price?: number;
}

export interface WhatsAppItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  options?: Record<string, unknown> | null;
  engraving?: WhatsAppEngraving | null;
}

export interface WhatsAppOrder {
  orderNumber: string;
  storeName?: string;
  customerName: string;
  phone?: string | null;
  email: string;
  items: WhatsAppItem[];
  shippingDepartment?: string | null;
  shippingCity?: string | null;
  shippingAddress?: string | null;
  shippingReference?: string | null;
  shippingCost: number;
  shippingEta?: string | null;
  subtotal: number;
  total: number;
  currency: string;
  notes?: string | null;
}

const LOCALE = 'es-BO';

export function formatMoney(cents: number, currency = 'BOB'): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function buildWhatsAppMessage(order: WhatsAppOrder): string {
  const money = (value: number) => formatMoney(value, order.currency);
  const lines: string[] = [];

  lines.push(`✦ *NUEVO PEDIDO · ${order.storeName ?? 'Tienda'}*`);
  lines.push(`Pedido: *${order.orderNumber}*`);
  lines.push('');
  lines.push('👤 *Cliente*');
  lines.push(`Nombre: ${order.customerName}`);
  if (order.phone) lines.push(`Teléfono: ${order.phone}`);
  lines.push(`Email: ${order.email}`);
  lines.push('');

  lines.push('🛍️ *Productos*');
  order.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name} (${item.sku}) x${item.quantity} — ${money(item.total)}`);
    if (item.options && Object.keys(item.options).length > 0) {
      const opts = Object.entries(item.options)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(' · ');
      lines.push(`   Variante: ${opts}`);
    }
    if (item.engraving?.enabled && item.engraving.text) {
      const details = [
        `"${item.engraving.text}"`,
        item.engraving.fontLabel,
        item.engraving.placementLabel,
        item.engraving.price ? `+ ${money(item.engraving.price)}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(`   ✎ Grabado láser: ${details}`);
    }
  });
  lines.push('');

  lines.push('📦 *Envío*');
  if (order.shippingDepartment) lines.push(`Departamento: ${order.shippingDepartment}`);
  if (order.shippingCity) lines.push(`Ciudad: ${order.shippingCity}`);
  if (order.shippingAddress) lines.push(`Dirección: ${order.shippingAddress}`);
  if (order.shippingReference) lines.push(`Referencia: ${order.shippingReference}`);
  lines.push(
    `Costo de envío: ${order.shippingCost === 0 ? 'GRATIS' : money(order.shippingCost)}`,
  );
  if (order.shippingEta) lines.push(`Entrega estimada: ${order.shippingEta}`);
  lines.push('');

  lines.push('🧾 *Resumen*');
  lines.push(`Subtotal: ${money(order.subtotal)}`);
  lines.push(`Envío: ${order.shippingCost === 0 ? 'GRATIS' : money(order.shippingCost)}`);
  lines.push(`*TOTAL: ${money(order.total)}*`);

  if (order.notes?.trim()) {
    lines.push('');
    lines.push('📝 *Notas*');
    lines.push(order.notes.trim());
  }

  lines.push('');
  lines.push('_Pedido generado desde la tienda online_');

  return lines.join('\n');
}

/** Genera el enlace wa.me listo para abrir en el móvil o en WhatsApp Web. */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function extractShippingAddress(address: Record<string, unknown> | null | undefined) {
  if (!address) return {};
  return {
    city: typeof address.city === 'string' ? address.city : null,
    line1: typeof address.line1 === 'string' ? address.line1 : null,
    line2: typeof address.line2 === 'string' ? address.line2 : null,
    department:
      typeof address.department === 'string' ? address.department : null,
    reference:
      typeof address.reference === 'string' ? address.reference : null,
  };
}
