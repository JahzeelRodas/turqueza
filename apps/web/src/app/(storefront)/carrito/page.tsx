import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { CartPageContent } from '@/components/cart/CartPageContent';

export const metadata: Metadata = { title: 'Carrito' };

export default function CartPage() {
  return (
    <div className="pb-24 pt-10 sm:pt-14">
      <Container>
        <nav aria-label="Ruta de navegación" className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="hover:text-fg">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg">Carrito</span>
        </nav>
        <h1 className="mt-6 font-serif text-4xl tracking-tight sm:text-5xl">Tu carrito</h1>
        <div className="mt-10">
          <CartPageContent />
        </div>
      </Container>
    </div>
  );
}
