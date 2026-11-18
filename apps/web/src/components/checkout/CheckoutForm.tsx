'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import type { CreatedOrder, ShippingZone } from '@/types/store';
import { useCart } from '@/store/cart';
import { confirmWhatsApp, createOrder } from '@/lib/api';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '@/lib/whatsapp';
import { cn, formatPrice } from '@/lib/utils';

interface FormState {
  customerName: string;
  email: string;
  phone: string;
  department: string;
  city: string;
  line1: string;
  reference: string;
  notes: string;
}

const emptyForm: FormState = {
  customerName: '',
  email: '',
  phone: '',
  department: '',
  city: '',
  line1: '',
  reference: '',
  notes: '',
};

const inputClass =
  'w-full rounded-button border border-line bg-bg px-4 py-3 font-sans text-sm text-fg outline-none transition-colors placeholder:text-muted/50 focus:border-accent';

export function CheckoutForm({
  zones,
  storeName,
  whatsappNumber,
  currency = 'BOB',
}: {
  zones: ShippingZone[];
  storeName: string;
  whatsappNumber: string;
  currency?: string;
}) {
  const { items, subtotal, clear, setQuantity, removeItem } = useCart();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const zone = useMemo(
    () => zones.find((item) => item.code === form.department),
    [zones, form.department],
  );
  const subtotalValue = subtotal();
  const shipping = zone
    ? zone.freeThreshold !== null && subtotalValue >= zone.freeThreshold
      ? 0
      : zone.price
    : 0;
  const total = subtotalValue + shipping;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'department' ? { city: '' } : {}),
    }));
  }

  function validate() {
    if (!form.customerName.trim()) return 'Ingresa tu nombre completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingresa un correo válido.';
    if (!form.phone.trim()) return 'Ingresa tu teléfono / WhatsApp.';
    if (!form.department) return 'Selecciona tu departamento de envío.';
    if (!form.city.trim()) return 'Ingresa tu ciudad.';
    if (!form.line1.trim()) return 'Ingresa tu dirección.';
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Tu carrito está vacío.');
      return;
    }

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);

    try {
      const created = await createOrder({
        customerName: form.customerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim() || undefined,
        shippingZoneCode: zone?.code,
        shippingAddress: {
          fullName: form.customerName.trim(),
          line1: form.line1.trim(),
          department: zone?.department ?? '',
          city: form.city.trim(),
          country: 'Bolivia',
          reference: form.reference.trim() || undefined,
          phone: form.phone.trim(),
        },
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          engraving: item.engraving?.enabled
            ? {
                enabled: true,
                text: item.engraving.text,
                font: item.engraving.font,
                placement: item.engraving.placement,
                fontLabel: item.engraving.fontLabel,
                placementLabel: item.engraving.placementLabel,
              }
            : undefined,
        })),
      });

      setOrder(created);
      clear();
      void confirmWhatsApp(created.orderNumber);
      if (created.whatsappUrl) {
        window.open(created.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      // Resiliencia: si la API falla, el cliente igual puede enviar el pedido.
      const message = buildWhatsAppMessage({
        storeName,
        customerName: form.customerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        items,
        department: zone?.department,
        city: form.city.trim(),
        address: form.line1.trim(),
        reference: form.reference.trim(),
        shippingCost: shipping,
        shippingEta: zone?.estimatedDays,
        subtotal: subtotalValue,
        notes: form.notes.trim(),
        currency,
      });
      setFallbackUrl(buildWhatsAppUrl(whatsappNumber, message));
      setError(
        err instanceof Error
          ? 'No pudimos registrar el pedido en el sistema, pero puedes enviarlo directamente por WhatsApp con el botón inferior.'
          : 'Error inesperado. Envía tu pedido por WhatsApp.',
      );
    } finally {
      setLoading(false);
    }
  }

  /* ── Pedido creado ──────────────────────────────────────────────────── */
  if (order) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-accent" strokeWidth={1.2} />
        <h1 className="mt-5 font-serif text-3xl sm:text-4xl">¡Pedido generado!</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Tu pedido <span className="font-sans text-fg">{order.orderNumber}</span> quedó registrado.
          Para confirmarlo, envía el mensaje prellenado a nuestra joyería por WhatsApp.
        </p>

        <div className="mt-6 rounded-card border border-line bg-surface p-5 text-left text-sm">
          <div className="flex justify-between border-b border-line pb-3">
            <span className="text-muted">Subtotal</span>
            <span>{formatPrice(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between border-b border-line py-3">
            <span className="text-muted">Envío</span>
            <span>{order.shipping === 0 ? 'GRATIS' : formatPrice(order.shipping, order.currency)}</span>
          </div>
          <div className="flex justify-between pt-3 font-serif text-xl">
            <span>Total</span>
            <span>{formatPrice(order.total, order.currency)}</span>
          </div>
        </div>

        {order.whatsappUrl ? (
          <a
            href={order.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-button bg-[#1f8f4e] px-6 py-4 font-sans text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#17703d]"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.6} />
            Enviar pedido por WhatsApp
          </a>
        ) : null}

        <Link
          href="/coleccion/todo"
          className="mt-3 block py-2 font-sans text-[10px] uppercase tracking-luxury text-muted hover:text-fg"
        >
          Seguir explorando
        </Link>
      </div>
    );
  }

  /* ── Carrito vacío ──────────────────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-serif text-3xl">Tu carrito está vacío</p>
        <p className="mt-3 text-sm text-muted">
          Añade una pieza y personalízala con grabado láser antes de finalizar.
        </p>
        <Link
          href="/coleccion/todo"
          className="mt-6 inline-block rounded-button bg-accent px-6 py-3.5 font-sans text-[10px] uppercase tracking-luxury text-accent-contrast"
        >
          Ver colección
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-8">
        <section>
          <h2 className="font-serif text-2xl">Datos de contacto</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                Nombre completo *
              </label>
              <input
                id="name"
                className={inputClass}
                value={form.customerName}
                onChange={(event) => update('customerName', event.target.value)}
                autoComplete="name"
                placeholder="Ana Pérez"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                Correo electrónico *
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                autoComplete="email"
                placeholder="ana@correo.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                Teléfono / WhatsApp *
              </label>
              <input
                id="phone"
                type="tel"
                className={inputClass}
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                autoComplete="tel"
                placeholder="+591 71234567"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl">Envío nacional</h2>
          <p className="mt-1 text-xs text-muted">
            Entregamos en los 9 departamentos de Bolivia con seguimiento.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="department" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                Departamento *
              </label>
              <select
                id="department"
                className={cn(inputClass, 'appearance-none')}
                value={form.department}
                onChange={(event) => update('department', event.target.value)}
              >
                <option value="">Selecciona un departamento</option>
                {zones.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.department}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="city" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                Ciudad *
              </label>
              <input
                id="city"
                className={inputClass}
                list="city-options"
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
                placeholder={zone?.cities[0] ?? 'Ciudad'}
                autoComplete="address-level2"
              />
              <datalist id="city-options">
                {zone?.cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                Dirección (calle, número, zona) *
              </label>
              <input
                id="address"
                className={inputClass}
                value={form.line1}
                onChange={(event) => update('line1', event.target.value)}
                autoComplete="street-address"
                placeholder="Av. Arce #2345, Sopocachi"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reference" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                Referencia (opcional)
              </label>
              <input
                id="reference"
                className={inputClass}
                value={form.reference}
                onChange={(event) => update('reference', event.target.value)}
                placeholder="Edificio, piso, color de puerta…"
              />
            </div>
            {zone ? (
              <p className="sm:col-span-2 rounded-card bg-accent-soft px-4 py-3 text-xs text-accent">
                {zone.department} · {zone.estimatedDays} ·{' '}
                {shipping === 0
                  ? 'Envío gratis por tu compra'
                  : formatPrice(zone.price, currency)}
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <label htmlFor="notes" className="mb-1.5 block font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
            Notas del pedido (opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className={cn(inputClass, 'resize-none')}
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            placeholder="Instrucciones especiales, fecha de entrega, mensaje de regalo…"
          />
        </section>
      </div>

      <aside className="h-fit rounded-card border border-line bg-surface p-5 lg:sticky lg:top-28">
        <h2 className="font-serif text-xl">Resumen</h2>

        <ul className="mt-4 divide-y divide-line">
          {items.map((item) => (
            <li key={item.key} className="flex gap-3 py-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[3px] bg-accent-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-sm">{item.name}</p>
                <p className="font-sans text-[9px] uppercase tracking-[0.12em] text-muted">
                  {item.variantName}
                </p>
                {item.engraving?.enabled ? (
                  <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.12em] text-accent">
                    ✎ {item.engraving.text} · {item.engraving.placementLabel}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-line font-sans text-[10px]">
                    <button
                      type="button"
                      className="px-2 py-0.5 text-muted hover:text-fg"
                      onClick={() => setQuantity(item.key, item.quantity - 1)}
                      aria-label="Reducir cantidad"
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      className="px-2 py-0.5 text-muted hover:text-fg"
                      onClick={() => setQuantity(item.key, item.quantity + 1)}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-xs">
                      {formatPrice(item.price * item.quantity, item.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="text-[10px] text-muted underline underline-offset-2 hover:text-accent"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatPrice(subtotalValue, currency)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Envío</span>
            <span>{form.department ? (shipping === 0 ? 'GRATIS' : formatPrice(shipping, currency)) : 'Por calcular'}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3 font-serif text-2xl">
            <span>Total</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-card bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700">
            {error}
          </p>
        ) : null}

        {fallbackUrl ? (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-button bg-[#1f8f4e] px-5 py-3.5 font-sans text-[10px] uppercase tracking-[0.16em] text-white"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.6} />
            Enviar pedido por WhatsApp
          </a>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-button bg-accent px-6 py-4 font-sans text-[11px] uppercase tracking-[0.18em] text-accent-contrast transition-colors hover:bg-fg hover:text-bg disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generando pedido…
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4" strokeWidth={1.6} /> Finalizar por WhatsApp
            </>
          )}
        </button>

        <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.5} />
          No se realiza ningún cobro online. El pedido se confirma directamente con la joyería
          por WhatsApp.
        </p>
      </aside>
    </form>
  );
}
