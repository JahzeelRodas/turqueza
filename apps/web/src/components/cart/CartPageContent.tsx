'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/utils';

export function CartPageContent() {
  const { items, subtotal, setQuantity, removeItem } = useCart();
  const total = subtotal();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-serif text-3xl">Tu carrito está vacío</p>
        <p className="mt-3 text-sm text-muted">
          Explora la colección y personaliza tu pieza con grabado láser.
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
    <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <ul className="divide-y divide-line border-y border-line">
        {items.map((item) => (
          <li key={item.key} className="flex gap-4 py-5 sm:gap-6">
            <Link
              href={`/producto/${item.slug}`}
              className="relative h-32 w-24 shrink-0 overflow-hidden rounded-card bg-accent-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/producto/${item.slug}`} className="font-serif text-xl hover:text-accent">
                    {item.name}
                  </Link>
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                    {item.variantName} · {item.sku}
                  </p>
                  {item.engraving?.enabled ? (
                    <p className="mt-2 inline-block rounded bg-surface px-2 py-1 font-sans text-[9px] uppercase tracking-[0.12em] text-accent">
                      ✎ {item.engraving.text} · {item.engraving.fontLabel} · {item.engraving.placementLabel}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label={`Eliminar ${item.name}`}
                  className="p-1 text-muted hover:text-accent"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4">
                <div className="inline-flex items-center rounded-button border border-line">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.key, item.quantity - 1)}
                    className="px-3 py-2 text-muted hover:text-fg"
                    aria-label="Reducir cantidad"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-7 text-center font-sans text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.key, item.quantity + 1)}
                    className="px-3 py-2 text-muted hover:text-fg"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="font-sans text-sm">
                  {formatPrice(item.price * item.quantity, item.currency)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-card border border-line bg-surface p-6">
        <h2 className="font-serif text-2xl">Resumen</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Envío</span>
            <span>Calculado en checkout</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-4 font-serif text-2xl">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        <Link
          href="/checkout"
          className="mt-6 block rounded-button bg-accent px-6 py-4 text-center font-sans text-[11px] uppercase tracking-[0.18em] text-accent-contrast transition-colors hover:bg-fg hover:text-bg"
        >
          Ir al checkout
        </Link>
        <Link
          href="/coleccion/todo"
          className="mt-3 block py-2 text-center font-sans text-[10px] uppercase tracking-luxury text-muted hover:text-fg"
        >
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
