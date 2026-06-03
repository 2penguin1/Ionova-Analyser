import { cn } from '~/lib/cn';
import type { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--surface)]',
        className
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </div>
  );
}
