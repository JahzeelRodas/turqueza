'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ruler, X } from 'lucide-react';

const sizeTable = [
  { eu: 48, diameter: 15.3, circumference: 48.0 },
  { eu: 50, diameter: 15.9, circumference: 50.0 },
  { eu: 52, diameter: 16.5, circumference: 52.0 },
  { eu: 54, diameter: 17.2, circumference: 54.0 },
  { eu: 56, diameter: 17.8, circumference: 56.0 },
  { eu: 58, diameter: 18.5, circumference: 58.0 },
  { eu: 60, diameter: 19.1, circumference: 60.0 },
];

/** Modal de guía de tallas (widget aislado de joyería, reutilizable). */
export function RingSizeGuideModal({ label = 'Guía de tallas' }: { label?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-accent underline underline-offset-4 hover:text-fg"
      >
        <Ruler className="h-3.5 w-3.5" strokeWidth={1.5} />
        {label}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-fg/40 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-card bg-bg p-6 shadow-soft sm:p-8"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Guía de tallas de anillos"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar guía de tallas"
                className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-accent-soft hover:text-fg"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <p className="font-sans text-[10px] uppercase tracking-luxury text-accent">
                Asesoría
              </p>
              <h2 className="mt-2 font-serif text-2xl sm:text-3xl">Encuentra tu talla</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Mide el diámetro interior de un anillo que ya te quede bien. También puedes
                rodear tu dedo con un hilo y medir su longitud.
              </p>

              <ol className="mt-5 space-y-2 text-xs leading-relaxed text-muted">
                <li>
                  <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-fg">01.</span>{' '}
                  Envuelve un hilo alrededor de la base del dedo sin apretar.
                </li>
                <li>
                  <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-fg">02.</span>{' '}
                  Marca el punto donde se cruza y mide la longitud en milímetros.
                </li>
                <li>
                  <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-fg">03.</span>{' '}
                  Compara la circunferencia con la tabla. Si estás entre dos tallas, elige la mayor.
                </li>
              </ol>

              <div className="mt-6 overflow-hidden rounded-card border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface font-sans text-[9px] uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Talla</th>
                      <th className="px-4 py-3">Diámetro</th>
                      <th className="px-4 py-3">Circunferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {sizeTable.map((row) => (
                      <tr key={row.eu} className="text-fg">
                        <td className="px-4 py-2.5 font-serif text-base">{row.eu}</td>
                        <td className="px-4 py-2.5 text-muted">{row.diameter} mm</td>
                        <td className="px-4 py-2.5 text-muted">{row.circumference} mm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-muted">
                ¿Dudas? Escríbenos por WhatsApp y te ayudamos a elegir la talla exacta antes de
                confirmar tu pedido.
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
