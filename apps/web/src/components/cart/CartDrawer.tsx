'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const { items, isOpen, closeCart, setQuantity, removeItem, subtotal } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCart]);

  if (!mounted) return null;

  const total = subtotal();

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-fg/40 backdrop-blur-sm"
          onClick={closeCart}
          role="presentation"
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-bg shadow-soft"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <p className="font-serif text-xl">Tu carrito</p>
                <p className="mt-0.5 font-sans text-[10px] uppercase tracking-luxury text-muted">
                  {items.length} {items.length === 1 ? 'pieza' : 'piezas'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Cerrar carrito"
                className="rounded-full p-2 text-fg transition-colors hover:bg-accent-soft"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <ShoppingBag className="h-10 w-10 text-line" strokeWidth={1} />
                <p className="font-serif text-2xl">Tu carrito está vacío</p>
                <p className="text-sm text-muted">
                  Descubre piezas pensadas para acompañarte toda la vida.
                </p>
                <Link
                  href="/coleccion/todo"
                  onClick={closeCart}
                  className="mt-2 rounded-button bg-fg px-6 py-3 font-sans text-[10px] uppercase tracking-luxury text-bg transition-colors hover:bg-accent"
                >
                  Explorar colección
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-4">
                      <Link
                        href={`/producto/${item.slug}`}
                        onClick={closeCart}
                        className="relative h-24 w-20 shrink-0 overflow-hidden rounded-card bg-accent-soft"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/producto/${item.slug}`}
                              onClick={closeCart}
                              className="block truncate font-serif text-base leading-tight hover:text-accent"
                            >
                              {item.name}
                            </Link>
                            <p className="mt-1 truncate font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                              {item.variantName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="shrink-0 p-1 text-muted transition-colors hover:text-accent"
                            aria-label={`Eliminar ${item.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>

                        {item.engraving?.enabled ? (
                          <p className="mt-1.5 rounded bg-surface px-2 py-1 font-sans text-[9px] uppercase tracking-[0.12em] text-accent">
                            ✎ {item.engraving.text} · {item.engraving.placementLabel}
                          </p>
                        ) : null}

                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="inline-flex items-center border border-line">
                            <button
                              type="button"
                              aria-label="Reducir cantidad"
                              className="px-2 py-1 text-muted hover:text-fg"
                              onClick={() => setQuantity(item.key, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-6 text-center font-sans text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Aumentar cantidad"
                              className="px-2 py-1 text-muted hover:text-fg"
                              onClick={() => setQuantity(item.key, item.quantity + 1)}
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

                <div className="border-t border-line px-6 py-5">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[10px] uppercase tracking-luxury text-muted">
                      Subtotal
                    </span>
                    <span className="font-serif text-2xl">{formatPrice(total)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Envío calculado en el checkout según departamento.
                  </p>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="mt-4 block rounded-button bg-accent px-6 py-4 text-center font-sans text-[11px] uppercase tracking-[0.18em] text-accent-contrast transition-colors hover:bg-fg hover:text-bg"
                  >
                    Finalizar por WhatsApp
                  </Link>
                  <Link
                    href="/carrito"
                    onClick={closeCart}
                    className="mt-2 block py-2 text-center font-sans text-[10px] uppercase tracking-luxury text-muted hover:text-fg"
                  >
                    Ver carrito completo
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
