import {
  BadgeCheck,
  Gem,
  RotateCcw,
  Shield,
  Sparkles,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { ValueProp } from '@/types/store';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

const icons: Record<string, LucideIcon> = {
  gem: Gem,
  truck: Truck,
  sparkles: Sparkles,
  shield: Shield,
  certificate: BadgeCheck,
  'rotate-ccw': RotateCcw,
};

export function ValuePropsBar({ items }: { items: ValueProp[] }) {
  if (!items?.length) return null;

  return (
    <section className="border-y border-line/60 bg-surface/70">
      <Container className="grid grid-cols-2 divide-line/70 lg:grid-cols-4 lg:divide-x">
        {items.map((item, index) => {
          const Icon = icons[item.icon] ?? Sparkles;
          return (
            <Reveal
              key={item.title}
              delay={index * 0.06}
              className="flex flex-col gap-3 px-2 py-8 sm:px-6 lg:px-8"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-gold" strokeWidth={1.4} />
                <span aria-hidden className="h-px flex-1 bg-line" />
              </span>
              <div>
                <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-fg">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </Reveal>
          );
        })}
      </Container>
    </section>
  );
}
