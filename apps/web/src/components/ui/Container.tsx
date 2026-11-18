import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Container({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'header' | 'footer' | 'main';
}) {
  return (
    <Tag className={cn('mx-auto w-full max-w-shell px-5 sm:px-8 lg:px-12', className)}>
      {children}
    </Tag>
  );
}
