import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgePercent, Sparkles } from 'lucide-react';
import { getProducts } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Ofertas',
  description:
    'Piezas seleccionadas en acero inoxidable con descuento de temporada. Diseños resistentes al agua, hipoalergénicos y con envíos a toda Bolivia.',
};

export default async function OffersPage() {
  const products = await getProducts({ onSale: true, take: 48 });
  const maxDiscount = products.reduce((max, product) => {
    if (!product.compareAtPrice || product.compareAtPrice <= product.price) return max;
    return Math.max(
      max,
      Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100),
    );
  }, 0);

  return (
    <div className="pb-24 pt-12 sm:pt-16">
      <Container>
        <nav
          aria-label="Ruta de navegación"
          className="font-sans text-[9px] uppercase tracking-[0.16em] text-muted"
        >
          <Link href="/" className="hover:text-fg">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg">Ofertas</span>
        </nav>

        <header className="mt-8 border-b border-line pb-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 border border-sale/25 bg-sale-soft px-3 py-1.5 font-sans text-[9px] uppercase tracking-[0.18em] text-sale">
                <BadgePercent className="h-3.5 w-3.5" strokeWidth={1.5} />
                Precios de temporada
              </span>
              <h1 className="mt-5 font-serif text-5xl leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
                Piezas en <span className="italic text-sale">oferta</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted">
                Una selección breve de nuestro atelier con descuentos por tiempo limitado.
                Cada pieza conserva su garantía, su certificado y el grabado láser disponible.
              </p>
            </div>
            <div className="flex items-end gap-8 lg:flex-col lg:items-end lg:gap-3">
              {maxDiscount > 0 ? (
                <div className="text-right">
                  <p className="font-serif text-5xl leading-none text-sale">−{maxDiscount}%</p>
                  <p className="mt-2 font-sans text-[8px] uppercase tracking-air text-muted">
                    Descuento máximo
                  </p>
                </div>
              ) : null}
              <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-muted">
                {products.length} {products.length === 1 ? 'pieza' : 'piezas'}
              </p>
            </div>
          </div>
        </header>

        {products.length === 0 ? (
          <div className="py-24 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line text-gold">
              <Sparkles className="h-5 w-5" strokeWidth={1.3} />
            </span>
            <p className="mt-5 font-serif text-3xl">No hay ofertas activas ahora mismo</p>
            <p className="mt-3 text-sm text-muted">
              Explora la colección completa; las piezas de temporada vuelven pronto.
            </p>
            <Link
              href="/coleccion/todo"
              className="mt-7 inline-block rounded-button bg-fg px-7 py-3.5 font-sans text-[10px] uppercase tracking-luxury text-bg transition-colors hover:bg-accent"
            >
              Ver toda la colección
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index * 0.04, 0.24)}>
                <ProductCard product={product} priority={index < 4} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-line pt-8 sm:flex-row sm:items-center">
          <p className="max-w-xl text-xs leading-relaxed text-muted">
            Los precios tachados corresponden al precio original. Las ofertas no son acumulables
            con otros descuentos y pueden finalizar sin previo aviso.
          </p>
          <Link
            href="/coleccion/todo"
            className="font-sans text-[9px] uppercase tracking-luxury text-fg transition-colors hover:text-accent"
          >
            Seguir explorando →
          </Link>
        </div>
      </Container>
    </div>
  );
}
