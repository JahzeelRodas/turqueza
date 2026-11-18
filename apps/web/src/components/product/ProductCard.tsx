'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';
import type { Product } from '@/types/store';
import { useCart } from '@/store/cart';
import { cn, discountPercent, formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const [selectedId, setSelectedId] = useState<string | null>(
    activeVariants[0]?.id ?? null,
  );
  const addItem = useCart((state) => state.addItem);

  const selected = activeVariants.find((variant) => variant.id === selectedId);
  const price = selected?.price ?? product.price;
  const compareAt = selected?.compareAtPrice ?? product.compareAtPrice;
  const discount = discountPercent(price, compareAt);
  const badge = product.attributes?.badges?.[0];
  const hoverImage = product.images[1] ?? product.images[0];
  const mainImage = selected?.imageUrl ?? product.images[0];
  const canAdd = activeVariants.length === 0 || Boolean(selected);
  const savings = discount && compareAt ? compareAt - price : 0;

  function handleAdd() {
    if (!canAdd) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: mainImage,
      sku: selected?.sku ?? product.slug.toUpperCase(),
      variantId: selected?.id ?? '',
      variantName: selected?.name ?? product.name,
      options: selected?.options ?? {},
      price,
      currency: product.currency,
      engraving: null,
    });
  }

  return (
    <motion.article
      whileHover="hover"
      initial="rest"
      animate="rest"
      className="group flex h-full flex-col"
    >
      <div className="relative overflow-hidden rounded-card bg-accent-soft ring-1 ring-line/60 transition-shadow duration-500 group-hover:shadow-soft">
        <Link
          href={`/producto/${product.slug}`}
          className="relative block aspect-[4/5] w-full"
          aria-label={`Ver ${product.name}`}
        >
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="image-luxe object-cover transition-[opacity,transform] duration-700 ease-silk group-hover:scale-[1.03] group-hover:opacity-0"
            />
          ) : null}
          {hoverImage ? (
            <motion.div
              variants={{ rest: { opacity: 0, scale: 1 }, hover: { opacity: 1, scale: 1.05 } }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={hoverImage}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="image-luxe object-cover"
              />
            </motion.div>
          ) : null}

          <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
            {discount ? <Badge tone="sale">−{discount}%</Badge> : null}
            {badge ? <Badge tone="light">{badge}</Badge> : null}
          </div>

          {product.engraving?.enabled ? (
            <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 border border-white/25 bg-fg/75 px-2.5 py-1 font-sans text-[8px] uppercase tracking-[0.16em] text-bg backdrop-blur">
              <span className="h-1 w-1 rounded-full bg-gold" />
              Grabado
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-fg shadow-soft transition-all duration-300 hover:bg-gold hover:text-fg disabled:opacity-40 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          aria-label={`Añadir ${product.name} al carrito`}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/producto/${product.slug}`} className="block">
              <h3 className="font-serif text-[1.15rem] leading-tight text-fg transition-colors group-hover:text-accent">
                {product.name}
              </h3>
            </Link>
            {product.subtitle ? (
              <p className="mt-1.5 truncate font-sans text-[9px] uppercase tracking-[0.16em] text-muted">
                {product.subtitle}
              </p>
            ) : null}
          </div>
          <ArrowUpRight
            className="mt-1 h-4 w-4 shrink-0 text-gold opacity-0 transition-all duration-500 group-hover:translate-x-0.5 group-hover:opacity-100"
            strokeWidth={1.4}
          />
        </div>

        {activeVariants.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeVariants.slice(0, 5).map((variant) => {
              const label = Object.values(variant.options ?? {})[0] ?? variant.name;
              const isSelected = variant.id === selectedId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedId(variant.id)}
                  className={cn(
                    'min-w-7 rounded-full border px-2 py-1 font-sans text-[9px] tracking-wide transition-colors',
                    isSelected
                      ? 'border-accent bg-accent text-accent-contrast'
                      : 'border-line text-muted hover:border-gold hover:text-fg',
                  )}
                  aria-label={`Variante ${variant.name}`}
                  aria-pressed={isSelected}
                >
                  {String(label).replace(/\s*\(.*\)/, '')}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-3">
          <span className="font-serif text-[17px] text-fg">
            {formatPrice(price, product.currency)}
          </span>
          {compareAt && compareAt > price ? (
            <span className="font-sans text-[11px] text-muted line-through decoration-sale/60">
              {formatPrice(compareAt, product.currency)}
            </span>
          ) : null}
          {savings > 0 ? (
            <span className="w-full font-sans text-[9px] uppercase tracking-[0.12em] text-sale">
              Ahorras {formatPrice(savings, product.currency)}
            </span>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
