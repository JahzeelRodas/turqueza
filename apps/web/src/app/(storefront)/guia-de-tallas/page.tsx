import type { Metadata } from 'next';
import { getStoreConfig } from '@/lib/api';
import { Container } from '@/components/ui/Container';
import { RingSizeGuideModal } from '@/components/product/RingSizeGuideModal';

export const metadata: Metadata = {
  title: 'Guía de tallas',
  description: 'Aprende a medir tu talla de anillo con precisión.',
};

const sizes = [
  { eu: 48, diameter: 15.3, circumference: 48.0 },
  { eu: 50, diameter: 15.9, circumference: 50.0 },
  { eu: 52, diameter: 16.5, circumference: 52.0 },
  { eu: 54, diameter: 17.2, circumference: 54.0 },
  { eu: 56, diameter: 17.8, circumference: 56.0 },
  { eu: 58, diameter: 18.5, circumference: 58.0 },
  { eu: 60, diameter: 19.1, circumference: 60.0 },
];

export const revalidate = 300;

export default async function SizeGuidePage() {
  const config = await getStoreConfig();
  const phone = (config.whatsappNumber ?? '').replace(/\D/g, '');

  return (
    <div className="pb-24 pt-10 sm:pt-14">
      <Container className="max-w-4xl">
        <p className="font-sans text-[10px] uppercase tracking-luxury text-accent">Asesoría</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Guía de tallas
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Una talla correcta hace toda la diferencia. Mide el diámetro interior de un anillo que
          ya te quede bien o rodea tu dedo con un hilo. Si estás entre dos tallas, elige la mayor.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Mide un anillo existente',
                text: 'Coloca el anillo sobre una regla y mide el diámetro interior (de borde interior a borde interior) en milímetros.',
              },
              {
                step: '02',
                title: 'O usa un hilo',
                text: 'Envuelve un hilo alrededor de la base del dedo sin apretar, marca el cruce y mide la longitud total en milímetros.',
              },
              {
                step: '03',
                title: 'Compara con la tabla',
                text: 'La circunferencia del hilo corresponde a la talla europea. Consulta la tabla para confirmar.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="font-serif text-2xl text-accent">{item.step}</span>
                <div>
                  <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-fg">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
                </div>
              </div>
            ))}

            <div className="rounded-card border border-line bg-surface p-5">
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-fg">
                ¿Necesitas ayuda personalizada?
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Escríbenos por WhatsApp y te acompañamos a elegir la talla exacta antes de
                confirmar tu pedido.
              </p>
              {phone ? (
                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent('Hola, necesito ayuda con la talla de un anillo.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block rounded-button bg-[#1f8f4e] px-5 py-2.5 font-sans text-[10px] uppercase tracking-[0.14em] text-white"
                >
                  Consultar por WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <div className="overflow-hidden rounded-card border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface font-sans text-[9px] uppercase tracking-[0.14em] text-muted">
                  <tr>
                    <th className="px-5 py-4">Talla EU</th>
                    <th className="px-5 py-4">Diámetro interior</th>
                    <th className="px-5 py-4">Circunferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sizes.map((row) => (
                    <tr key={row.eu}>
                      <td className="px-5 py-3 font-serif text-lg">{row.eu}</td>
                      <td className="px-5 py-3 text-muted">{row.diameter} mm</td>
                      <td className="px-5 py-3 text-muted">{row.circumference} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Tabla orientativa. Las piezas artesanales pueden variar ±0,2 mm.
            </p>
            <div className="mt-5">
              <RingSizeGuideModal label="Abrir guía rápida" />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
