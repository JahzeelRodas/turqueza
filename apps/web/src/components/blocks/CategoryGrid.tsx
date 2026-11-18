'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Block } from '@/types/store';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';

type CategoryGridBlock = Extract<Block, { type: 'category-grid' }>;

export function CategoryGrid({ block }: { block: CategoryGridBlock }) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Explora"
            title={block.title ?? 'Colecciones'}
            subtitle={block.subtitle}
          />
          {block.cta ? (
            <ButtonLink href={block.cta.href} variant="outline" size="sm" className="shrink-0">
              {block.cta.label}
            </ButtonLink>
          ) : null}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {block.categories.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={`/coleccion/${category.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-accent-soft ring-1 ring-line/50"
              >
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="image-luxe object-cover transition-transform duration-[1100ms] ease-silk group-hover:scale-[1.06]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute left-4 top-4 font-sans text-[8px] uppercase tracking-air text-white/60">
                  0{index + 1}
                </span>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white sm:p-5">
                  <div>
                    <p className="font-serif text-xl leading-tight sm:text-2xl">{category.name}</p>
                    <p className="mt-1.5 font-sans text-[8px] uppercase tracking-air text-gold">
                      Explorar colección
                    </p>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 transition-colors duration-500 group-hover:border-gold group-hover:bg-gold group-hover:text-fg">
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
