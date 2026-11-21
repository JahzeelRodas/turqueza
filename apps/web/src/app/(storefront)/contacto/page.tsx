import type { Metadata } from 'next';
import { getStoreConfig } from '@/lib/api';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escríbenos por WhatsApp o visítanos en La Paz, Bolivia.',
};

export const revalidate = 300;

export default async function ContactPage() {
  const config = await getStoreConfig();
  const phone = (config.whatsappNumber ?? '59171234567').replace(/\D/g, '');
  const message = encodeURIComponent('Hola, quisiera información sobre una pieza de Turquesa.');

  return (
    <div className="pb-24 pt-10 sm:pt-14">
      <Container className="max-w-3xl">
        <p className="font-sans text-[10px] uppercase tracking-luxury text-accent">Contacto</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Hablemos de tu próxima joya
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Atendemos por WhatsApp de lunes a sábado, de 9:00 a 19:00 (hora de Bolivia). También
          puedes visitar nuestra sala de exposición.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href={`https://wa.me/${phone}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-card bg-accent p-6 text-accent-contrast transition-colors hover:bg-fg"
          >
            <p className="font-sans text-[10px] uppercase tracking-[0.16em] opacity-70">WhatsApp</p>
            <p className="mt-2 font-serif text-2xl">+{phone}</p>
            <p className="mt-3 text-xs opacity-80">Respuesta en menos de 24 horas.</p>
          </a>

          <div className="rounded-card border border-line bg-surface p-6">
            <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted">Atelier</p>
            <p className="mt-2 font-serif text-2xl">Santa Cruz, Bolivia</p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Santa Cruz · Visitas con cita previa.
              <br />
              Lunes a sábado · 9:00 – 19:00
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-card border border-line p-6">
          <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-fg">Envíos</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Entregamos en los 9 departamentos de Bolivia: La Paz, Santa Cruz, Cochabamba, Tarija,
            Oruro, Potosí, Chuquisaca, Beni y Pando. Consulta costos y tiempos en nuestra{' '}
            <a href="/envios" className="text-accent underline underline-offset-4">
              página de envíos
            </a>
            .
          </p>
        </div>
      </Container>
    </div>
  );
}
