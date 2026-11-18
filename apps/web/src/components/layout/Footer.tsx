import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { FooterConfig } from '@/types/store';
import { Container } from '@/components/ui/Container';

export function Footer({
  storeName,
  config,
}: {
  storeName: string;
  config: FooterConfig;
}) {
  return (
    <footer className="mt-24 bg-fg text-bg">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
        <div className="max-w-sm">
          <p className="font-serif text-2xl tracking-[0.18em] text-bg">
            {storeName.replace(' Joyería', '')}
            <span className="text-gold">.</span>
          </p>
          {config.description ? (
            <p className="mt-5 text-sm leading-relaxed text-bg/55">{config.description}</p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-5">
            {config.social?.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 font-sans text-[9px] uppercase tracking-luxury text-bg/60 transition-colors hover:text-gold"
              >
                {link.label}
                <ArrowUpRight
                  className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                  strokeWidth={1.5}
                />
              </a>
            ))}
          </div>
        </div>

        {config.columns?.map((column) => (
          <div key={column.title}>
            <p className="font-sans text-[9px] uppercase tracking-air text-gold">
              {column.title}
            </p>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-bg/60 transition-colors hover:text-bg"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {column.title.toLowerCase() === 'tienda' ? (
                <li>
                  <Link
                    href="/ofertas"
                    className="text-sm text-sale-soft transition-colors hover:text-bg"
                  >
                    Ofertas
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        ))}

        <div>
          <p className="font-sans text-[9px] uppercase tracking-air text-gold">
            Envíos nacionales
          </p>
          <p className="mt-5 text-sm leading-relaxed text-bg/55">
            La Paz · Santa Cruz · Cochabamba · Tarija · Oruro · Potosí · Chuquisaca · Beni · Pando
          </p>
          <p className="mt-5 inline-flex items-center gap-2 border border-bg/20 px-3 py-1.5 font-sans text-[8px] uppercase tracking-[0.16em] text-bg/70">
            <Sparkles className="h-3 w-3 text-gold" strokeWidth={1.5} />
            Checkout por WhatsApp
          </p>
        </div>
      </Container>

      <div className="border-t border-bg/10">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-center sm:flex-row sm:text-left">
          <p className="font-sans text-[9px] uppercase tracking-[0.16em] text-bg/40">
            {config.legal ?? `© ${new Date().getFullYear()} ${storeName}`}
          </p>
          <p className="font-sans text-[9px] uppercase tracking-[0.16em] text-bg/40">
            Joyería de autor · Hecho a mano en Bolivia
          </p>
        </Container>
      </div>
    </footer>
  );
}
