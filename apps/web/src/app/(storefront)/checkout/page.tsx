import type { Metadata } from 'next';
import Link from 'next/link';
import { getShippingZones, getStoreConfig } from '@/lib/api';
import { Container } from '@/components/ui/Container';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Finaliza tu pedido por WhatsApp con envío a toda Bolivia.',
};

export const revalidate = 120;

export default async function CheckoutPage() {
  const [config, zones] = await Promise.all([getStoreConfig(), getShippingZones()]);

  return (
    <div className="pb-24 pt-10 sm:pt-14">
      <Container>
        <nav aria-label="Ruta de navegación" className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="hover:text-fg">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link href="/coleccion/todo" className="hover:text-fg">
            Colección
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg">Checkout</span>
        </nav>

        <div className="mt-8 max-w-2xl">
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Finaliza tu pedido
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Completamos los datos una sola vez y generamos un mensaje con tu carrito, el grabado
            láser y el envío a tu departamento, listo para enviar por WhatsApp.
          </p>
        </div>

        <div className="mt-10">
          <CheckoutForm
            zones={zones}
            storeName={config.storeName}
            whatsappNumber={config.whatsappNumber ?? '59171234567'}
            currency={config.currency}
          />
        </div>
      </Container>
    </div>
  );
}
