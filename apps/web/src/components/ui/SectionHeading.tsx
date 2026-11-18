import { cn } from '@/lib/utils';

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-3 font-sans text-[10px] uppercase tracking-luxury text-muted',
        className,
      )}
    >
      <span aria-hidden className="h-px w-10 bg-gold" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 font-serif text-3xl leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-[2.9rem]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
