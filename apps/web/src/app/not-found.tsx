import Link from 'next/link';

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-accent">
        Error 404
      </p>
      <h1 className="mt-4 font-serif text-4xl tracking-tight text-fg sm:text-5xl">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        El enlace que buscas no existe o fue movido.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-button bg-accent px-6 py-3.5 font-sans text-[10px] uppercase tracking-luxury text-accent-contrast"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
