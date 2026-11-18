'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, MapPin } from 'lucide-react';
import type { Block } from '@/types/store';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

type HeroBlock = Extract<Block, { type: 'hero' }>;

const heights: Record<string, string> = {
  sm: 'min-h-[54vh]',
  md: 'min-h-[74vh]',
  lg: 'min-h-[88vh]',
  screen: 'min-h-[calc(100vh-6rem)]',
};

export function HeroSection({ block }: { block: HeroBlock }) {
  const reduce = useReducedMotion();
  const overlay = block.overlay ?? 0.3;

  return (
    <section
      className={`relative isolate flex ${heights[block.minHeight ?? 'md']} items-end overflow-hidden`}
    >
      <div className="absolute inset-0 -z-10">
        {block.media.type === 'video' ? (
          <video
            className="h-full w-full object-cover"
            src={block.media.src}
            poster={block.media.poster}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <Image
            src={block.media.src}
            alt={block.media.alt ?? block.title}
            fill
            priority={block.imagePriority}
            sizes="100vw"
            className="image-luxe object-cover"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5"
          style={{ opacity: Math.min(Math.max(overlay + 0.35, 0.15), 0.95) }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
      </div>

      {/* Marco editorial fino, visible en pantallas grandes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-4 hidden border border-white/15 sm:block lg:inset-6"
      />

      <Container className="relative pb-16 pt-24 text-white sm:pb-24 lg:pb-28">
        <div className="max-w-2xl">
          {block.eyebrow ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3"
            >
              <span aria-hidden className="h-px w-10 bg-gold" />
              <p className="font-sans text-[9px] uppercase tracking-air text-white/75">
                {block.eyebrow}
              </p>
            </motion.div>
          ) : null}

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 26 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 font-serif text-[2.9rem] leading-[0.98] tracking-tight sm:text-6xl lg:text-[5.1rem]"
          >
            {block.title}
          </motion.h1>

          {block.subtitle ? (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-md text-sm leading-relaxed text-white/75 sm:text-[15px]"
            >
              {block.subtitle}
            </motion.p>
          ) : null}

          {block.ctas?.length ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mt-9 flex flex-wrap gap-3"
            >
              {block.ctas.map((cta) =>
                cta.variant === 'outline' ? (
                  <ButtonLink
                    key={cta.label}
                    href={cta.href}
                    variant="outline"
                    size="lg"
                    className="border-white/45 text-white hover:border-white hover:bg-white hover:text-fg"
                  >
                    {cta.label}
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    key={cta.label}
                    href={cta.href}
                    size="lg"
                    className="bg-bg text-fg hover:bg-gold hover:text-fg"
                  >
                    {cta.label}
                  </ButtonLink>
                ),
              )}
            </motion.div>
          ) : null}
        </div>
      </Container>

      <div className="pointer-events-none absolute bottom-8 right-8 hidden flex-col items-end gap-4 text-white/55 lg:flex">
        <span className="inline-flex items-center gap-2 font-sans text-[8px] uppercase tracking-air">
          <MapPin className="h-3 w-3 text-gold" strokeWidth={1.4} />
          Atelier · La Paz
        </span>
        <span className="flex items-center gap-3">
          <span className="font-sans text-[8px] uppercase tracking-air">Desliza</span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown className="h-4 w-4" strokeWidth={1.2} />
          </motion.span>
        </span>
      </div>
    </section>
  );
}
