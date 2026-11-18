import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategories, getProducts } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { cn, slugToTitle } from '@/lib/utils';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug === 'todo' ? 'Toda la colección' : slugToTitle(slug);
  return { title, description: `Descubre ${title.toLowerCase()} de Turquesa Joyería.` };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ category: slug === 'todo' ? undefined : slug, search: q, take: 48 }),
  ]);

  const heading = slug === 'todo' ? 'Toda la colección' : slugToTitle(slug);
  const description =
    categories.find((category) => category.slug === slug)?.description ??
    'Piezas atemporales trabajadas a mano en nuestro atelier de La Paz.';

  return (
    <div className="pb-24 pt-12 sm:pt-16">
      <Container>
        <nav aria-label="Ruta de navegación" className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="hover:text-fg">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg">{heading}</span>
        </nav>

        <div className="mt-8 flex flex-col justify-between gap-6 border-b border-line pb-10 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <span className="font-sans text-[9px] uppercase tracking-air text-gold">
              {slug === 'todo' ? 'Catálogo completo' : 'Colección'}
            </span>
            <h1 className="mt-3 font-serif text-4xl leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              {heading}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">{description}</p>
          </div>
          <p className="font-sans text-[9px] uppercase tracking-luxury text-muted">
            {products.length} {products.length === 1 ? 'pieza' : 'piezas'}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <FilterChip href="/coleccion/todo" active={slug === 'todo'}>
            Todo
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.slug}
              href={`/coleccion/${category.slug}`}
              active={slug === category.slug}
            >
              {category.name}
            </FilterChip>
          ))}
          <Link
            href="/ofertas"
            className="inline-flex items-center gap-1.5 rounded-button border border-sale/30 bg-sale-soft px-4 py-2 font-sans text-[10px] uppercase tracking-[0.14em] text-sale transition-colors hover:bg-sale hover:text-white"
          >
            Ofertas
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-3xl">Aún no hay piezas en esta colección</p>
            <p className="mt-3 text-sm text-muted">
              Vuelve pronto o explora toda la colección.
            </p>
            <Link
              href="/coleccion/todo"
              className="mt-6 inline-block rounded-button bg-fg px-6 py-3.5 font-sans text-[10px] uppercase tracking-luxury text-bg transition-colors hover:bg-accent"
            >
              Ver todo
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index * 0.04, 0.24)}>
                <ProductCard product={product} priority={index < 4} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-button border px-4 py-2 font-sans text-[10px] uppercase tracking-[0.14em] transition-colors',
        active
          ? 'border-fg bg-fg text-bg'
          : 'border-line text-muted hover:border-fg hover:text-fg',
      )}
    >
      {children}
    </Link>
  );
}
