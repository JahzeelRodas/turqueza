import { cn } from '@/lib/utils';

export function Badge({
  children,
  tone = 'light',
  className,
}: {
  children: React.ReactNode;
  tone?: 'light' | 'dark' | 'accent' | 'sale' | 'gold';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 font-sans text-[9px] uppercase tracking-[0.16em]',
        tone === 'light' && 'bg-surface/92 text-fg backdrop-blur',
        tone === 'dark' && 'bg-fg text-bg',
        tone === 'accent' && 'bg-accent text-accent-contrast',
        tone === 'sale' && 'bg-sale text-white',
        tone === 'gold' && 'bg-gold text-fg',
        className,
      )}
    >
      {children}
    </span>
  );
}
