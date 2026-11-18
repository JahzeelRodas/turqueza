import type { Metadata } from 'next';
import { getShippingZones } from '@/lib/api';
import { Container } from '@/components/ui/Container';
import { formatPrice } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Envíos y entregas',
  description: 'Costos y tiempos de envío a los 9 departamentos de Bolivia.',
};

export const revalidate = 300;

export default async function ShippingPage() {
  const zones = await getShippingZones();

  return (
    <div className="pb-24 pt-10 sm:pt-14">
      <Container className="max-w-4xl">
        <p className="font-sans text-[10px] uppercase tracking-luxury text-accent">Logística</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Envíos nacionales
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Preparamos cada pieza en nuestro atelier de La Paz y la enviamos asegurada a cualquier
          departamento de Bolivia. El costo se calcula automáticamente en el checkout según tu
          destino.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Envío gratis', text: 'En compras desde Bs 1.500.' },
            { title: 'Seguimiento', text: 'Código de rastreo por WhatsApp.' },
            { title: 'Embalaje de regalo', text: 'Incluido en todas las piezas.' },
          ].map((item) => (
            <div key={item.title} className="rounded-card border border-line bg-surface p-5">
              <p className="font-sans text-[10px] uppercase tracking-[0.14em]">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-card border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface font-sans text-[9px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-5 py-4">Departamento</th>
                <th className="px-5 py-4">Ciudades principales</th>
                <th className="px-5 py-4">Costo</th>
                <th className="px-5 py-4">Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td className="px-5 py-4 font-serif text-base">{zone.department}</td>
                  <td className="px-5 py-4 text-xs text-muted">{zone.cities.join(' · ')}</td>
                  <td className="px-5 py-4 text-xs">{formatPrice(zone.price)}</td>
                  <td className="px-5 py-4 text-xs text-muted">{zone.estimatedDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          Los tiempos se cuentan en días hábiles desde la confirmación del pedido por WhatsApp. Las
          piezas con grabado láser requieren hasta 2 días adicionales de preparación. Envío gratuito
          en pedidos desde Bs 1.500.
        </p>
      </Container>
    </div>
  );
}
