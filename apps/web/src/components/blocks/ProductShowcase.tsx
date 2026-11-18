import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Block, Product } from '@/types/store';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

type ShowcaseBlock = Extract<Block, { type: 'product-showcase' }>;

export function ProductShowcase({
  block,
  products,
}: {
  block: ShowcaseBlock;
  products: Product[];
}) {
  const list = block.products?.length ? block.products : products;
  if (!list.length) return null;
  const hasSale = list.some(
    (product) =>
      product.compareAtPrice && product.compareAtPrice > product.price,
  );

  return (
    <section className="border-y border-line/60 bg-surface py-20 sm:py-28">
      <Container>
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Selección"
            title={block.title ?? 'Destacados'}
            subtitle={block.subtitle}
          />
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {hasSale ? (
              <Link
                href="/ofertas"
                className="inline-flex items-center gap-2 border border-sale/30 bg-sale-soft px-4 py-2.5 font-sans text-[9px] uppercase tracking-luxury text-sale transition-colors hover:bg-sale hover:text-white"
              >
                Ver ofertas
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            ) : null}
            {block.cta ? (
              <ButtonLink href={block.cta.href} variant="outline" size="sm">
                {block.cta.label}
              </ButtonLink>
            ) : null}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
          {list.slice(0, 8).map((product, index) => (
            <Reveal key={product.id} delay={Math.min(index * 0.05, 0.25)}>
              <ProductCard product={product} priority={index < 2} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
