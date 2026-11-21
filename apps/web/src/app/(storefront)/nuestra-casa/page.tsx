import type { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Nuestra casa',
  description: 'Conoce Turquesa Joyería: piezas en acero inoxidable 316L y grabado láser en Santa Cruz, Bolivia.',
};

export default function AboutPage() {
  return (
    <div className="pb-24 pt-10 sm:pt-14">
      <Container>
        <div className="max-w-3xl">
          <p className="font-sans text-[10px] uppercase tracking-luxury text-accent">Nuestra casa</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            Joyería hecha para acompañarte cada día.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Turquesa nace en Santa Cruz con una propuesta clara: ofrecer joyería en acero
            inoxidable quirúrgico 316L con diseños atemporales, alta durabilidad y grabado láser
            personalizado para convertir cada pieza en un detalle único.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-accent-soft">
            <Image
              src="/images/about-1.jpg"
              alt="Colección de joyería en acero inoxidable Turquesa"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-accent-soft sm:mt-12">
            <Image
              src="/images/about-2.jpg"
              alt="Detalle de grabado láser en acero inoxidable"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
            Diseño contemporáneo, durabilidad y personalización en cada detalle.
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted">
            <p>
              Seleccionamos y acabamos cada pieza cuidando la pureza de sus líneas, la comodidad al
              llevarla y su resistencia al ritmo del día a día. Buscamos que cada diseño conserve su
              brillo y elegancia con el paso del tiempo.
            </p>
            <p>
              Trabajamos con acero inoxidable quirúrgico 316L: un material hipoalergénico,
              resistente al agua y que no se oxida ni mancha la piel. Realizamos el grabado láser en
              nuestro propio espacio en Santa Cruz, permitiéndote personalizar cada joya con
              precisión y un acabado limpio.
            </p>
            <p>
              Si estás en Santa Cruz, puedes coordinar una visita a nuestra sala de exposición. Si
              estás en otro departamento, te asesoramos por WhatsApp en cada paso hasta que recibas
              tu pedido.
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