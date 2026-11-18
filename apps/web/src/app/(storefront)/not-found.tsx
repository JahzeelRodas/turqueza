import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="font-sans text-[10px] uppercase tracking-luxury text-accent">Error 404</p>
      <h1 className="mt-4 font-serif text-5xl tracking-tight sm:text-6xl">Esta pieza no existe</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        Puede que la hayamos retirado de la colección o que el enlace esté mal escrito.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/coleccion/todo"
          className="rounded-button bg-accent px-6 py-3.5 font-sans text-[10px] uppercase tracking-luxury text-accent-contrast"
        >
          Ver colección
        </Link>
        <Link
          href="/"
          className="rounded-button border border-line px-6 py-3.5 font-sans text-[10px] uppercase tracking-luxury text-fg hover:border-fg"
        >
          Volver al inicio
        </Link>
      </div>
    </Container>
  );
}
