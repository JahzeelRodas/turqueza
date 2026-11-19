'use client';

import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import type { EngravingConfig, EngravingSelection } from '@/types/store';
import { cn, formatPrice } from '@/lib/utils';

/**
 * Asistente de grabado láser.
 *
 * Componente controlado: recibe la configuración JSON del producto y emite la
 * selección completa (texto, tipografía, ubicación y precio) al checkout.
 */
export function LaserEngravingCustomizer({
  config,
  value,
  onChange,
  currency = 'BOB',
}: {
  config: EngravingConfig;
  value: EngravingSelection | null;
  onChange: (value: EngravingSelection | null) => void;
  currency?: string;
}) {
  const inputId = useId();
  const enabled = Boolean(value?.enabled);
  const font = config.fonts.find((item) => item.id === value?.font) ?? config.fonts[0];
  const placement =
    config.placements.find((item) => item.id === value?.placement) ?? config.placements[0];

  function toggle(next: boolean) {
    if (!next) {
      onChange(null);
      return;
    }
    onChange({
      enabled: true,
      text: value?.text ?? '',
      font: font?.id ?? 'serif',
      fontLabel: font?.label ?? 'Clásica',
      placement: (placement?.id as 'interior' | 'exterior') ?? 'interior',
      placementLabel: placement?.label ?? 'Interior',
      price: config.price,
      className: font?.className,
    });
  }

  function patch(next: Partial<EngravingSelection>) {
    if (!value) return;
    onChange({ ...value, ...next, price: config.price });
  }

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles className="h-4 w-4" strokeWidth={1.4} />
          </span>
          <div>
            <label htmlFor={`${inputId}-toggle`} className="font-sans text-[11px] uppercase tracking-[0.14em] text-fg">
              Grabado láser personalizado
            </label>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Añade un nombre, una fecha o una coordenada. + {formatPrice(config.price, currency)}
            </p>
          </div>
        </div>

        <button
          id={`${inputId}-toggle`}
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => toggle(!enabled)}
          className={cn(
            'relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors duration-300',
            enabled ? 'bg-accent' : 'bg-line',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300',
              enabled ? 'left-[22px]' : 'left-0.5',
            )}
          />
          <span className="sr-only">Activar grabado láser</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {enabled && value ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-line p-4 sm:p-5">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`${inputId}-text`}
                    className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted"
                  >
                    Texto del grabado
                  </label>
                  <span
                    className={cn(
                      'font-sans text-[10px] tabular-nums',
                      value.text.length > config.maxChars ? 'text-red-600' : 'text-muted',
                    )}
                  >
                    {value.text.length}/{config.maxChars}
                  </span>
                </div>
                <input
                  id={`${inputId}-text`}
                  type="text"
                  value={value.text}
                  maxLength={config.maxChars}
                  onChange={(event) => patch({ text: event.target.value })}
                  placeholder="Ej. A & M · 14.02.2026"
                  autoComplete="off"
                  className="mt-2 w-full rounded-button border border-line bg-bg px-4 py-3 font-serif text-base text-fg outline-none transition-colors placeholder:font-sans placeholder:text-xs placeholder:uppercase placeholder:tracking-[0.14em] placeholder:text-muted/60 focus:border-accent"
                />
              </div>

              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                  Tipografía
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {config.fonts.map((option) => {
                    const selected = option.id === value.font;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          patch({ font: option.id, fontLabel: option.label, className: option.className })
                        }
                        className={cn(
                          'relative rounded-button border px-2 py-3 text-center transition-colors',
                          selected
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-line text-muted hover:border-fg hover:text-fg',
                        )}
                      >
                        <span className={cn('block truncate text-base', option.className ?? 'font-serif')}>
                          Aa
                        </span>
                        <span className="mt-2 block font-sans text-[9px] uppercase tracking-[0.12em]">
                          {option.label}
                        </span>
                        {selected ? (
                          <Check className="absolute right-1.5 top-1.5 h-3 w-3" strokeWidth={2} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                  Ubicación
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {config.placements.map((option) => {
                    const selected = option.id === value.placement;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          patch({
                            placement: option.id as 'interior' | 'exterior',
                            placementLabel: option.label,
                          })
                        }
                        className={cn(
                          'rounded-button border px-3 py-3 text-left transition-colors',
                          selected
                            ? 'border-accent bg-accent-soft'
                            : 'border-line hover:border-fg',
                        )}
                      >
                        <span className="flex items-center justify-between font-sans text-[10px] uppercase tracking-[0.12em] text-fg">
                          {option.label}
                          {selected ? <Check className="h-3 w-3 text-accent" strokeWidth={2} /> : null}
                        </span>
                        {option.description ? (
                          <span className="mt-1 block text-[10px] leading-snug text-muted">
                            {option.description}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista previa en tiempo real */}
              <div>
                <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                  Vista previa
                </p>
                <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-[#e8e2d8] to-[#cfc6b8]">
                  <div
                    className={cn(
                      'relative flex items-center justify-center rounded-full border-[7px] border-[#c9b98f] shadow-inner',
                      value.placement === 'interior' ? 'h-24 w-24' : 'h-24 w-28',
                    )}
                    style={{ boxShadow: 'inset 0 0 18px rgba(0,0,0,.18), 0 6px 16px rgba(0,0,0,.16)' }}
                  >
                    <span
                      className={cn(
                        'max-w-[86%] truncate px-1 text-center text-[10px] text-[#6b5a35]',
                        value.className ?? 'font-serif tracking-[0.18em]',
                        value.placement === 'interior' ? 'opacity-80' : '',
                      )}
                    >
                      {value.text || 'Tu grabado'}
                    </span>
                  </div>
                  <span className="absolute bottom-2 right-3 font-sans text-[8px] uppercase tracking-luxury text-black/35">
                    {value.placementLabel} · vista referencial
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
