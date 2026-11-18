'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import type { Block } from '@/types/store';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/SectionHeading';

type StoryBlock = Extract<Block, { type: 'storytelling' }>;

export function SplitContentBlock({ block }: { block: StoryBlock }) {
  const reduce = useReducedMotion();
  const paragraphs = block.body.split('\n').filter((line) => line.trim().length > 0);

  return (
    <section className="py-20 sm:py-28">
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={block.mirror ? 'lg:order-2' : ''}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-accent-soft ring-1 ring-line/60">
            <div aria-hidden className="absolute inset-4 z-10 border border-white/15" />
            {block.media.type === 'video' ? (
              <video
                src={block.media.src}
                poster={block.media.poster}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={block.media.src}
                alt={block.media.alt ?? block.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="image-luxe object-cover"
              />
            )}
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={block.mirror ? 'lg:order-1' : ''}
        >
          {block.eyebrow ? <Eyebrow>{block.eyebrow}</Eyebrow> : null}
          <h2 className="mt-4 max-w-lg font-serif text-3xl leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.9rem]">
            {block.title}
          </h2>
          <div className="mt-6 space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
                {paragraph}
              </p>
            ))}
          </div>
          {block.cta ? (
            <ButtonLink href={block.cta.href} variant="outline" className="mt-8">
              {block.cta.label}
            </ButtonLink>
          ) : null}
        </motion.div>
      </Container>
    </section>
  );
}
