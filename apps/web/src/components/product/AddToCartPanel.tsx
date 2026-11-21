'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import type { EngravingSelection, Product } from '@/types/store';
import { useCart } from '@/store/cart';
import { cn, discountPercent, formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { LaserEngravingCustomizer } from './LaserEngravingCustomizer';
import { RingSizeGuideModal } from './RingSizeGuideModal';

export function AddToCartPanel({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCart((state) => state.addItem);
  const closeCart = useCart((state) => state.closeCart);
  const activeVariants = product.variants.filter((variant) => variant.isActive && variant.stock > 0);
  const [variantId, setVariantId] = useState<string | null>(activeVariants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [engraving, setEngraving] = useState<EngravingSelection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => product.variants.find((variant) => variant.id === variantId),
    [product.variants, variantId],
  );

  const basePrice = selected?.price ?? product.price;
  const compareAt = selected?.compareAtPrice ?? product.compareAtPrice;
  const discount = discountPercent(basePrice, compareAt);
  const engravingPrice = engraving?.enabled ? engraving.price : 0;
  const unitPrice = basePrice + engravingPrice;
  const maxStock = selected?.stock ?? product.stock;
  const hasVariants = product.variants.length > 0;
  const soldOut = hasVariants ? activeVariants.length === 0 : product.stock <= 0;

  function validate() {
    if (hasVariants && !selected) return 'Selecciona una variante disponible.';
    if (engraving?.enabled && !engraving.text.trim()) {
      return 'Escribe el texto que quieres grabar o desactiva el grabado.';
    }
    return null;
  }




  function add(goToCheckout = false) {
    const problem = validate();
    setError(problem);
    if (problem) return;

    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0] ?? '',
        sku: selected?.sku ?? product.sku ?? product.id,
        variantId: selected?.id ?? product.id,
        variantName: selected?.name ?? 'Estándar',
        options: selected?.options ?? {},
        price: unitPrice,
        currency: product.currency,
        engraving: engraving?.enabled ? engraving : null,
      },
      quantity,
    );

    if (goToCheckout) {
      closeCart();
      router.push('/checkout');
    }
  }

  /*function add(goToCheckout = false) {
    const problem = validate();
    setError(problem);
    if (problem || !selected) return;

    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0] ?? '',
        sku: selected.sku,
        variantId: selected.id,
        variantName: selected.name,
        options: selected.options,
        price: unitPrice,
        currency: product.currency,
        engraving: engraving?.enabled ? engraving : null,
      },
      quantity,
    );

    if (goToCheckout) {
      closeCart();
      router.push('/checkout');
    }
  }*/

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-luxury text-muted">
          {product.subtitle}
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.8rem]">
          {product.name}
        </h1>

        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="font-serif text-3xl">{formatPrice(unitPrice, product.currency)}</span>
          {compareAt && compareAt > basePrice ? (
            <span className="font-sans text-sm text-muted line-through decoration-sale/60">
              {formatPrice(compareAt, product.currency)}
            </span>
          ) : null}
          {discount ? <Badge tone="sale">−{discount}% de descuento</Badge> : null}
          {engravingPrice > 0 ? (
            <span className="font-sans text-[9px] uppercase tracking-[0.14em] text-accent">
              incluye grabado
            </span>
          ) : null}
        </div>
        {discount && compareAt ? (
          <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.12em] text-sale">
            Ahorras {formatPrice(compareAt - basePrice, product.currency)} · precio de temporada
          </p>
        ) : null}

        {product.description ? (
          <p className="mt-5 text-sm leading-relaxed text-muted">{product.description}</p>
        ) : null}
      </div>

      {hasVariants ? (
        <div>
          <div className="flex items-center justify-between">
            <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-fg">
              {Object.keys(product.variants[0]?.options ?? {})[0] ?? 'Variante'}
            </p>
            {product.attributes?.hasSizeGuide ? <RingSizeGuideModal /> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const disabled = variant.stock <= 0 || !variant.isActive;
              const active = variant.id === variantId;
              const label = Object.values(variant.options ?? {})[0] ?? variant.name;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setVariantId(variant.id);
                    setQuantity(1);
                  }}
                  aria-pressed={active}
                  className={cn(
                    'min-w-11 rounded-button border px-3 py-2 font-sans text-[10px] uppercase tracking-[0.1em] transition-colors',
                    active
                      ? 'border-accent bg-accent text-accent-contrast'
                      : 'border-line text-fg hover:border-gold',
                    disabled && 'cursor-not-allowed border-line text-muted/40 line-through hover:border-line',
                  )}
                >
                  {String(label)}
                </button>
              );
            })}
          </div>
          {selected && selected.stock <= 3 ? (
            <p className="mt-2 text-[11px] text-accent">
              Quedan {selected.stock} unidades en esta variante.
            </p>
          ) : null}
        </div>
      ) : null}

      {product.engraving?.enabled ? (
        <LaserEngravingCustomizer
          config={product.engraving}
          value={engraving}
          onChange={setEngraving}
          currency={product.currency}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="inline-flex items-center justify-between rounded-button border border-line sm:w-32">
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            className="px-3 py-3 text-muted hover:text-fg"
            aria-label="Reducir cantidad"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="font-sans text-sm tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.min(maxStock || 1, current + 1, 20))}
            className="px-3 py-3 text-muted hover:text-fg"
            aria-label="Aumentar cantidad"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => add(false)}
          disabled={soldOut}
          className="flex flex-1 items-center justify-center gap-2 rounded-button bg-fg px-6 py-4 font-sans text-[10px] uppercase tracking-[0.18em] text-bg transition-colors hover:bg-accent hover:text-accent-contrast disabled:opacity-40"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
          {soldOut ? 'Agotado' : 'Añadir al carrito'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => add(true)}
        disabled={soldOut}
        className="rounded-button border border-fg px-6 py-4 font-sans text-[10px] uppercase tracking-[0.18em] text-fg transition-colors hover:bg-gold hover:border-gold disabled:opacity-40"
      >
        Comprar ahora por WhatsApp
      </button>

      {error ? (
        <p role="alert" className="rounded-card bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2 border-t border-line pt-5 text-[11px] leading-relaxed text-muted">
        <li>• Envío asegurado a los 9 departamentos de Bolivia.</li>
        <li>• Grabado láser realizado en nuestro atelier de La Paz.</li>
        <li>• Embalaje de regalo y certificado de autenticidad incluidos.</li>
      </ul>
    </div>
  );
}
