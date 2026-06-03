import { cn } from '~/lib/cn';
import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border text-[var(--text-primary)] hover:bg-[var(--surface-raised)]',
  ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]',
  danger: 'bg-danger text-white hover:bg-danger/80',
};

const sizes = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        variant === 'secondary' && 'border-[var(--border-default)]',
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
