'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function ProductGallery({
  images,
  name,
  badges = [],
  saleLabel,
}: {
  images: string[];
  name: string;
  badges?: string[];
  saleLabel?: string | null;
}) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [''];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-accent-soft ring-1 ring-line/60">
        <AnimatePresence mode="wait">
          <motion.div
            key={list[active]}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {list[active] ? (
              <Image
                src={list[active]}
                alt={name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="image-luxe object-cover"
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {saleLabel ? (
            <span className="bg-sale px-3 py-1 font-sans text-[9px] uppercase tracking-[0.14em] text-white">
              −{saleLabel}% oferta
            </span>
          ) : null}
          {badges.map((badge) => (
            <span
              key={badge}
              className="bg-surface/90 px-3 py-1 font-sans text-[9px] uppercase tracking-[0.14em] text-fg backdrop-blur"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {list.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {list.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagen ${index + 1} de ${name}`}
              aria-current={active === index}
              className={cn(
                'relative aspect-square overflow-hidden rounded-[3px] bg-accent-soft ring-1 transition-all',
                active === index ? 'ring-accent' : 'ring-transparent hover:ring-line',
              )}
            >
              {image ? (
                <Image src={image} alt="" fill sizes="120px" className="object-cover" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
