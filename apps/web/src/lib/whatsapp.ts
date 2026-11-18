import type { CartLine } from '@/store/cart';
import { formatPrice } from './utils';

/**
 * Copia del formateador de la API para el checkout resiliente del storefront.
 * Si la API no responde, el cliente puede seguir enviando su pedido por WhatsApp
 * con los datos del carrito (sin número de orden).
 */
export function buildWhatsAppMessage(params: {
  storeName: string;
  customerName: string;
  phone?: string;
  email: string;
  items: CartLine[];
  department?: string;
  city?: string;
  address?: string;
  reference?: string;
  shippingCost: number;
  shippingEta?: string;
  subtotal: number;
  notes?: string;
  currency?: string;
}) {
  const money = (value: number) => formatPrice(value, params.currency ?? 'BOB');
  const total = params.subtotal + params.shippingCost;
  const lines: string[] = [];

  lines.push(`✦ *NUEVO PEDIDO · ${params.storeName}*`);
  lines.push('_Pedido generado desde la tienda online_');
  lines.push('');
  lines.push('👤 *Cliente*');
  lines.push(`Nombre: ${params.customerName}`);
  if (params.phone) lines.push(`Teléfono: ${params.phone}`);
  lines.push(`Email: ${params.email}`);
  lines.push('');
  lines.push('🛍️ *Productos*');
  params.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name} (${item.sku}) x${item.quantity} — ${money(item.price * item.quantity)}`);
    if (item.variantName) lines.push(`   Variante: ${item.variantName}`);
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
  if (params.department) lines.push(`Departamento: ${params.department}`);
  if (params.city) lines.push(`Ciudad: ${params.city}`);
  if (params.address) lines.push(`Dirección: ${params.address}`);
  if (params.reference) lines.push(`Referencia: ${params.reference}`);
  lines.push(`Costo de envío: ${params.shippingCost === 0 ? 'GRATIS' : money(params.shippingCost)}`);
  if (params.shippingEta) lines.push(`Entrega estimada: ${params.shippingEta}`);
  lines.push('');
  lines.push('🧾 *Resumen*');
  lines.push(`Subtotal: ${money(params.subtotal)}`);
  lines.push(`Envío: ${params.shippingCost === 0 ? 'GRATIS' : money(params.shippingCost)}`);
  lines.push(`*TOTAL: ${money(total)}*`);

  if (params.notes?.trim()) {
    lines.push('');
    lines.push('📝 *Notas*');
    lines.push(params.notes.trim());
  }

  return lines.join('\n');
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppUrl(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
}
