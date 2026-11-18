import type { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Nuestra casa',
  description: 'La historia y el atelier de Turquesa Joyería en La Paz, Bolivia.',
};

export default function AboutPage() {
  return (
    <div className="pb-24 pt-10 sm:pt-14">
      <Container>
        <div className="max-w-3xl">
          <p className="font-sans text-[10px] uppercase tracking-luxury text-accent">Nuestra casa</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            Una joya se hereda.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Turquesa nació en La Paz en 1987 como un pequeño taller familiar. Hoy seguimos
            trabajando con las mismas manos, la misma paciencia y una convicción: las piezas que
            importan se hacen despacio.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-accent-soft">
            <Image
              src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=1600&auto=format&fit=crop"
              alt="Atelier de joyería"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-accent-soft sm:mt-12">
            <Image
              src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1600&auto=format&fit=crop"
              alt="Detalle de brazalete tejido"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
            Del boceto a la pieza final, todo ocurre en nuestro taller.
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted">
            <p>
              Dibujamos cada diseño a mano, tallamos la cera, fundimos el metal y engastamos las
              piedras una a una. No producimos en serie: cada joya pasa por las mismas manos hasta
              que queda exactamente como la imaginamos.
            </p>
            <p>
              Trabajamos con oro trazable, plata 925 y piedras naturales certificadas. El grabado
              láser se realiza también en casa, lo que nos permite personalizar tu pieza sin perder
              el carácter artesanal.
            </p>
            <p>
              Si estás en La Paz, puedes visitarnos con cita previa. Si estás en otro departamento,
              te acompañamos por WhatsApp en todo el proceso.
            </p>
            <ButtonLink href="/contacto" variant="outline" className="mt-2">
              Reservar una cita
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  );
}
