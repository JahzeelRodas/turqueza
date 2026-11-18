'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, ShoppingBag, X, ChevronDown } from 'lucide-react';
import type { Navigation } from '@/types/store';
import { useCart } from '@/store/cart';
import { cn } from '@/lib/utils';
import { Container } from '@/components/ui/Container';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function Header({
  storeName,
  navigation,
}: {
  storeName: string;
  navigation: Navigation;
}) {
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const count = useCart((state) => state.count());
  const openCart = useCart((state) => state.openCart);
  const isOffers = pathname === '/ofertas';

  useEffect(() => setMounted(true), []);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40">
        {navigation.announcement ? (
          <div className="bg-fg px-4 py-2.5 text-center font-sans text-[9px] uppercase tracking-air text-bg/75">
            <span className="mr-2 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-gold" />
            {navigation.announcement}
          </div>
        ) : null}

        <div
          className={cn(
            'border-b border-line/60 bg-bg/80 backdrop-blur-xl transition-all duration-500',
            scrolled && 'bg-bg/95 shadow-[0_18px_40px_-38px_rgba(23,20,15,0.75)]',
          )}
        >
          <Container className="flex h-16 items-center justify-between gap-6 lg:h-[5.5rem]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-fg lg:hidden"
                aria-label="Abrir menú"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" strokeWidth={1.4} />
              </button>

              <Link
                href="/"
                className="group flex flex-col items-start leading-none"
                aria-label={`${storeName} · inicio`}
              >
                <span className="font-serif text-xl tracking-[0.2em] text-fg transition-colors group-hover:text-accent lg:text-2xl">
                  {storeName.replace(' Joyería', '')}
                  <span className="text-gold">.</span>
                </span>
                <span className="mt-1 hidden font-sans text-[8px] uppercase tracking-air text-muted sm:block">
                  Alta joyería · La Paz
                </span>
              </Link>
            </div>

            <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
              {navigation.groups.map((group) => {
                const isOpen = openMega === group.label;
                return (
                  <div
                    key={group.label}
                    className="relative"
                    onMouseEnter={() => group.mega && setOpenMega(group.label)}
                    onMouseLeave={() => setOpenMega(null)}
                  >
                    <Link
                      href={group.href ?? '#'}
                      className="link-rule inline-flex items-center gap-1.5 py-2 font-sans text-[10px] uppercase tracking-[0.18em] text-fg/85 transition-colors hover:text-fg"
                      aria-expanded={group.mega ? isOpen : undefined}
                      aria-haspopup={group.mega ? 'true' : undefined}
                      onFocus={() => group.mega && setOpenMega(group.label)}
                    >
                      {group.label}
                      {group.mega ? (
                        <ChevronDown
                          className={cn('h-3 w-3 text-gold transition-transform', isOpen && 'rotate-180')}
                          strokeWidth={1.6}
                        />
                      ) : null}
                    </Link>

                    <AnimatePresence>
                      {group.mega && isOpen ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-1/2 top-full z-50 w-[min(920px,90vw)] -translate-x-1/2 pt-5"
                          onMouseLeave={() => setOpenMega(null)}
                        >
                          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
                            <div className="h-px w-full bg-gold/70" />
                            <div className="grid grid-cols-[1.65fr_1fr] gap-10 p-8">
                              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                                {group.mega.columns.map((column) => (
                                  <div key={column.title}>
                                    <p className="mb-3 font-sans text-[9px] uppercase tracking-air text-gold">
                                      {column.title}
                                    </p>
                                    <ul className="space-y-2.5">
                                      {column.links.map((link) => (
                                        <li key={`${column.title}-${link.label}`}>
                                          <Link
                                            href={link.href}
                                            className="text-sm text-fg/75 transition-colors hover:text-accent"
                                          >
                                            {link.label}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>

                              {group.mega.promo ? (
                                <Link
                                  href={group.mega.promo.href}
                                  className="group relative overflow-hidden bg-fg text-bg"
                                >
                                  {group.mega.promo.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={group.mega.promo.imageUrl}
                                      alt=""
                                      className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105"
                                    />
                                  ) : null}
                                  <div className="absolute inset-0 bg-gradient-to-t from-fg/90 via-fg/20 to-transparent" />
                                  <div className="relative flex h-full min-h-44 flex-col justify-end p-5">
                                    {group.mega.promo.eyebrow ? (
                                      <span className="font-sans text-[8px] uppercase tracking-air text-gold">
                                        {group.mega.promo.eyebrow}
                                      </span>
                                    ) : null}
                                    <span className="mt-2 font-serif text-xl leading-tight">
                                      {group.mega.promo.title}
                                    </span>
                                    {group.mega.promo.body ? (
                                      <span className="mt-2 text-xs leading-relaxed text-bg/70">
                                        {group.mega.promo.body}
                                      </span>
                                    ) : null}
                                    <span className="mt-4 inline-flex items-center gap-1 font-sans text-[9px] uppercase tracking-luxury text-bg">
                                      Descubrir
                                      <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
                                    </span>
                                  </div>
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/ofertas"
                data-active={isOffers}
                className={cn(
                  'link-rule hidden items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.18em] transition-colors sm:inline-flex',
                  isOffers ? 'text-sale' : 'text-sale/90 hover:text-sale',
                )}
              >
                <span className="h-1 w-1 rounded-full bg-sale" />
                Ofertas
              </Link>
              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex items-center gap-2 text-fg transition-colors hover:text-accent"
                aria-label={`Abrir carrito (${mounted ? count : 0} artículos)`}
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.4} />
                <span className="hidden font-sans text-[10px] uppercase tracking-[0.18em] sm:inline">
                  Carrito
                </span>
                {mounted && count > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-sans text-[9px] font-medium text-fg">
                    {count}
                  </span>
                ) : null}
              </button>
            </div>
          </Container>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-fg/45 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-full w-[88%] max-w-sm flex-col bg-bg p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xl tracking-[0.18em]">
                    {storeName.replace(' Joyería', '')}
                    <span className="text-gold">.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Cerrar menú"
                    className="rounded-full border border-line p-2 text-fg hover:bg-accent-soft"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                <nav className="mt-10 flex-1 overflow-y-auto" aria-label="Menú móvil">
                  <ul className="space-y-6">
                    {navigation.groups.map((group) => (
                      <li key={group.label}>
                        <Link
                          href={group.href ?? group.mega?.columns[0]?.links[0]?.href ?? '/'}
                          className="font-serif text-2xl text-fg"
                        >
                          {group.label}
                        </Link>
                        {group.mega ? (
                          <ul className="mt-3 space-y-2 border-l border-line pl-4">
                            {group.mega.columns.flatMap((column) =>
                              column.links.map((link) => (
                                <li key={`${group.label}-${column.title}-${link.label}`}>
                                  <Link
                                    href={link.href}
                                    className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted"
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              )),
                            )}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                    <li>
                      <Link
                        href="/ofertas"
                        className="font-serif text-2xl text-sale"
                      >
                        Ofertas
                      </Link>
                    </li>
                  </ul>
                </nav>

                <Link
                  href="/guia-de-tallas"
                  className="mt-6 rounded-button border border-fg px-5 py-3 text-center font-sans text-[10px] uppercase tracking-luxury text-fg"
                >
                  Guía de tallas
                </Link>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <CartDrawer />
    </>
  );
}
