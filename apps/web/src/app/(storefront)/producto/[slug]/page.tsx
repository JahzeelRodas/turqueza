import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gem, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { getProduct, getProducts } from '@/lib/api';
import { Container } from '@/components/ui/Container';
import { ProductGallery } from '@/components/product/ProductGallery';
import { AddToCartPanel } from '@/components/product/AddToCartPanel';
import { ProductCard } from '@/components/product/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Pieza no encontrada' };

  return {
    title: product.name,
    description: product.description ?? product.subtitle ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = (
    await getProducts({ category: product.category?.slug, take: 5 })
  )
    .filter((item) => item.id !== product.id)
    .slice(0, 4);

  const specs = Object.entries(product.metadata ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  );

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? String(
          Math.round(
            ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100,
          ),
        )
      : null;

  return (
    <div className="pb-20 pt-8">
      <Container>
        <nav aria-label="Ruta de navegación" className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="hover:text-fg">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link href="/coleccion/todo" className="hover:text-fg">
            Colección
          </Link>
          {product.category ? (
            <>
              <span className="mx-2">/</span>
              <Link href={`/coleccion/${product.category.slug}`} className="hover:text-fg">
                {product.category.name}
              </Link>
            </>
          ) : null}
          <span className="mx-2">/</span>
          <span className="text-fg">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <ProductGallery
            images={product.images}
            name={product.name}
            badges={product.attributes?.badges ?? []}
            saleLabel={discount}
          />
          <AddToCartPanel product={product} />
        </div>

        <div className="mt-20 grid gap-12 border-t border-line pt-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-serif text-3xl">Detalles de la pieza</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Cada joya se trabaja individualmente en nuestro atelier. Las medidas pueden variar
              ligeramente por el carácter artesanal de la pieza.
            </p>

            {product.engraving?.enabled ? (
              <div className="mt-6 rounded-card border border-line bg-surface p-5">
                <p className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.14em] text-accent">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> Grabado láser disponible
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Personaliza esta pieza con hasta {product.engraving.maxChars} caracteres. El
                  grabado se realiza a mano en nuestro taller de La Paz y añade 2 días hábiles a
                  la preparación del pedido.
                </p>
              </div>
            ) : null}
          </div>

          <div>
            {specs.length > 0 ? (
              <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {specs.map(([key, value]) => (
                  <div key={key} className="border-b border-line py-4">
                    <dt className="font-sans text-[9px] uppercase tracking-[0.16em] text-muted">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="mt-1 font-serif text-lg text-fg">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Feature icon={Gem} title="Materiales nobles" text="Oro y plata con certificado de autenticidad." />
              <Feature icon={Sparkles} title="Hecho a mano" text="Trabajado pieza a pieza en La Paz, Bolivia." />
              <Feature icon={PackageCheck} title="Envío asegurado" text="Cobertura en los 9 departamentos del país." />
              <Feature icon={ShieldCheck} title="Garantía de por vida" text="Pulido y ajuste de talla sin costo." />
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-24">
            <SectionHeading eyebrow="Continúa" title="También te puede interesar" />
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
              {related.map((item, index) => (
                <Reveal key={item.id} delay={index * 0.05}>
                  <ProductCard product={item} />
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Gem;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-card bg-surface p-4">
      <Icon className="h-4 w-4 text-accent" strokeWidth={1.4} />
      <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.14em]">{title}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}
